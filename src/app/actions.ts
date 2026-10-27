"use server";

import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { z } from "zod/v4";
import { prisma } from "@/lib/db";
import { parseIsoDate, processDocument } from "@/lib/documents";
import { CATEGORIES } from "@/lib/categories";
import { isSupportedMimeType } from "@/lib/extraction";
import { requireUser } from "@/lib/session";

const MAX_FILES = 5;
const MAX_FILE_BYTES = 10 * 1024 * 1024;

export type UploadState = { error?: string };

export async function uploadDocuments(
  _prev: UploadState,
  formData: FormData,
): Promise<UploadState> {
  const user = await requireUser();
  const files = formData
    .getAll("files")
    .filter((f): f is File => f instanceof File && f.size > 0);

  if (files.length === 0) return { error: "Choose at least one file." };
  if (files.length > MAX_FILES) return { error: `Upload at most ${MAX_FILES} files at a time.` };
  for (const file of files) {
    if (!isSupportedMimeType(file.type)) {
      return { error: `${file.name}: only PDF, JPEG, PNG, WebP and GIF are supported.` };
    }
    if (file.size > MAX_FILE_BYTES) {
      return { error: `${file.name} is larger than 10MB.` };
    }
  }

  const ids: string[] = [];
  for (const file of files) {
    const doc = await prisma.document.create({
      data: {
        userId: user.id,
        fileName: file.name,
        mimeType: file.type,
        fileSize: file.size,
        fileData: new Uint8Array(await file.arrayBuffer()),
      },
      select: { id: true },
    });
    ids.push(doc.id);
  }

  // Extraction takes several seconds per file; respond first and let the list poll.
  after(() => Promise.all(ids.map(processDocument)));

  revalidatePath("/", "layout");
  redirect(ids.length === 1 ? `/documents/${ids[0]}` : "/documents");
}

/** 404s unless the signed-in user owns the document, so ids can't be probed. */
async function requireOwnDocument(id: string) {
  const user = await requireUser();
  const doc = await prisma.document.findFirst({
    where: { id, userId: user.id },
    select: { id: true },
  });
  if (!doc) notFound();
  return doc;
}

export async function retryDocument(id: string) {
  await requireOwnDocument(id);
  await prisma.document.update({
    where: { id },
    data: { status: "PROCESSING", error: null },
  });
  after(() => processDocument(id));
  revalidatePath("/", "layout");
}

export async function deleteDocument(id: string) {
  await requireOwnDocument(id);
  await prisma.document.delete({ where: { id } });
  revalidatePath("/", "layout");
  redirect("/documents");
}

const blankToNull = (v: unknown) => (typeof v === "string" && v.trim() === "" ? null : v);
const optionalText = z.preprocess(blankToNull, z.string().trim().max(200).nullable());
const optionalAmount = z.preprocess(blankToNull, z.coerce.number().finite().nullable());
const optionalDate = z.preprocess(
  blankToNull,
  z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
);

const CorrectionSchema = z.object({
  vendorName: optionalText,
  documentNumber: optionalText,
  issueDate: optionalDate,
  dueDate: optionalDate,
  currency: z.preprocess(blankToNull, z.string().trim().regex(/^[A-Za-z]{3}$/).nullable()),
  subtotal: optionalAmount,
  tax: optionalAmount,
  total: optionalAmount,
  category: z.enum(CATEGORIES),
});

export type CorrectionState = { error?: string; saved?: boolean };

export async function saveCorrections(
  id: string,
  _prev: CorrectionState,
  formData: FormData,
): Promise<CorrectionState> {
  await requireOwnDocument(id);
  const parsed = CorrectionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const field = parsed.error.issues[0]?.path.join(".");
    return { error: `Check the ${field || "form"} field.` };
  }
  const v = parsed.data;
  await prisma.document.update({
    where: { id },
    data: {
      ...v,
      currency: v.currency?.toUpperCase() ?? null,
      issueDate: parseIsoDate(v.issueDate),
      dueDate: parseIsoDate(v.dueDate),
      reviewed: true,
    },
  });
  revalidatePath("/", "layout");
  return { saved: true };
}
