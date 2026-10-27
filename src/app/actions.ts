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
import { deleteObject, headObject, newObjectKey, presignUpload } from "@/lib/storage";

const MAX_FILES = 5;
const MAX_FILE_BYTES = 10 * 1024 * 1024;

const FileMeta = z.object({
  name: z.string().trim().min(1).max(255),
  type: z.string(),
  size: z.number().int().positive(),
});

export type PreparedUpload = { key: string; url: string };

/**
 * Step one of an upload: validate what the browser says it will send and hand
 * back signed URLs. The files go straight to storage, so they never hit the
 * platform's request-size limit.
 */
export async function prepareUploads(
  files: z.input<typeof FileMeta>[],
): Promise<{ error: string } | { uploads: PreparedUpload[] }> {
  const user = await requireUser();
  const parsed = z.array(FileMeta).min(1).max(MAX_FILES).safeParse(files);
  if (!parsed.success) return { error: `Choose between 1 and ${MAX_FILES} files.` };

  for (const file of parsed.data) {
    if (!isSupportedMimeType(file.type)) {
      return { error: `${file.name}: only PDF, JPEG, PNG, WebP and GIF are supported.` };
    }
    if (file.size > MAX_FILE_BYTES) return { error: `${file.name} is larger than 10MB.` };
  }

  const uploads = await Promise.all(
    parsed.data.map(async (file) => {
      const key = newObjectKey(user.id);
      return { key, url: await presignUpload(key, file.type) };
    }),
  );
  return { uploads };
}

const CompletedUpload = z.object({ key: z.string(), name: FileMeta.shape.name });

/**
 * Step two: record the uploads. Checks what actually landed in storage rather
 * than trusting the browser, since the signed URL doesn't limit size.
 */
export async function completeUploads(
  items: z.input<typeof CompletedUpload>[],
): Promise<{ error: string }> {
  const user = await requireUser();
  const parsed = z.array(CompletedUpload).min(1).max(MAX_FILES).safeParse(items);
  if (!parsed.success) return { error: "Something went wrong. Try again." };

  const ownPrefix = `users/${user.id}/`;
  const ids: string[] = [];
  for (const item of parsed.data) {
    if (!item.key.startsWith(ownPrefix)) return { error: "Something went wrong. Try again." };

    const stored = await headObject(item.key);
    if (!stored) return { error: `${item.name} didn't finish uploading. Try again.` };
    if (!isSupportedMimeType(stored.contentType) || stored.size > MAX_FILE_BYTES) {
      await deleteObject(item.key).catch(() => {});
      return { error: `${item.name} isn't a supported file under 10MB.` };
    }

    const doc = await prisma.document.upsert({
      // Idempotent, so a double submit doesn't create a second row for the same object.
      where: { storageKey: item.key },
      update: {},
      create: {
        userId: user.id,
        fileName: item.name,
        mimeType: stored.contentType,
        fileSize: stored.size,
        storageKey: item.key,
      },
      select: { id: true, status: true },
    });
    if (doc.status === "PROCESSING") ids.push(doc.id);
  }

  // Extraction takes several seconds per file; respond first and let the list poll.
  after(() => Promise.all(ids.map(processDocument)));

  revalidatePath("/", "layout");
  redirect(parsed.data.length === 1 && ids.length === 1 ? `/documents/${ids[0]}` : "/documents");
}

/** 404s unless the signed-in user owns the document, so ids can't be probed. */
async function requireOwnDocument(id: string) {
  const user = await requireUser();
  const doc = await prisma.document.findFirst({
    where: { id, userId: user.id },
    select: { id: true, storageKey: true },
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
  const doc = await requireOwnDocument(id);
  await prisma.document.delete({ where: { id } });
  // Row first: a leftover object is harmless, a row pointing at nothing is not.
  await deleteObject(doc.storageKey).catch((err) =>
    console.error(`Failed to delete object ${doc.storageKey}`, err),
  );
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

const FIELD_ERRORS: Record<string, string> = {
  currency: "Currency must be a 3-letter code, like NGN",
  issueDate: "Invalid date",
  dueDate: "Invalid date",
  subtotal: "Subtotal must be a number",
  tax: "Tax must be a number",
  total: "Total must be a number",
  category: "Pick a category",
};

export type CorrectionState = { error?: string; field?: string; savedAt?: number };

export async function saveCorrections(
  id: string,
  _prev: CorrectionState,
  formData: FormData,
): Promise<CorrectionState> {
  await requireOwnDocument(id);
  const parsed = CorrectionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const field = String(parsed.error.issues[0]?.path[0] ?? "");
    return { error: FIELD_ERRORS[field] ?? "Check the highlighted field", field };
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
  return { savedAt: Date.now() };
}
