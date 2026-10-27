import "server-only";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import {
  extractDocument,
  ExtractionError,
  isSupportedMimeType,
  type Extraction,
} from "@/lib/extraction";
import type { ReportDocument } from "@/lib/reports";
import type { Prisma } from "@/generated/prisma/client";

const listSelect = {
  id: true,
  fileName: true,
  status: true,
  error: true,
  createdAt: true,
  vendorName: true,
  documentNumber: true,
  issueDate: true,
  currency: true,
  subtotal: true,
  tax: true,
  total: true,
  category: true,
  reviewed: true,
} satisfies Prisma.DocumentSelect;

export async function listDocuments() {
  const user = await requireUser();
  return prisma.document.findMany({
    where: { userId: user.id },
    select: listSelect,
    orderBy: { createdAt: "desc" },
  });
}

export async function getDocument(id: string) {
  const user = await requireUser();
  return prisma.document.findFirst({
    where: { id, userId: user.id },
    omit: { fileData: true },
    include: { lineItems: { orderBy: { position: "asc" } } },
  });
}

export async function getReportDocuments(): Promise<ReportDocument[]> {
  const user = await requireUser();
  const docs = await prisma.document.findMany({
    where: { userId: user.id, status: "READY" },
    select: {
      id: true,
      fileName: true,
      vendorName: true,
      documentNumber: true,
      issueDate: true,
      currency: true,
      subtotal: true,
      tax: true,
      total: true,
      category: true,
    },
    orderBy: [{ issueDate: "desc" }, { createdAt: "desc" }],
  });
  return docs.map((d) => ({
    ...d,
    subtotal: d.subtotal?.toNumber() ?? null,
    tax: d.tax?.toNumber() ?? null,
    total: d.total?.toNumber() ?? null,
  }));
}

/**
 * Runs extraction for a stored document and records the result or the failure.
 * Runs in the background with no request, so callers must check ownership first.
 */
export async function processDocument(id: string) {
  const doc = await prisma.document.findUnique({
    where: { id },
    select: { fileData: true, mimeType: true },
  });
  if (!doc) return;

  try {
    if (!isSupportedMimeType(doc.mimeType)) {
      throw new ExtractionError(`Unsupported file type: ${doc.mimeType}`);
    }
    const extraction = await extractDocument(Buffer.from(doc.fileData), doc.mimeType);
    await saveExtraction(id, extraction);
  } catch (err) {
    console.error(`Extraction failed for document ${id}`, err);
    const message =
      err instanceof ExtractionError ? err.message : "Extraction failed. Try again.";
    await prisma.document.update({
      where: { id },
      data: { status: "FAILED", error: message },
    });
  }
}

async function saveExtraction(id: string, x: Extraction) {
  await prisma.$transaction([
    prisma.lineItem.deleteMany({ where: { documentId: id } }),
    prisma.document.update({
      where: { id },
      data: {
        status: "READY",
        error: null,
        documentType: x.documentType,
        vendorName: x.vendorName,
        documentNumber: x.documentNumber,
        issueDate: parseIsoDate(x.issueDate),
        dueDate: parseIsoDate(x.dueDate),
        currency: x.currency?.toUpperCase() ?? null,
        subtotal: x.subtotal,
        tax: x.tax,
        total: x.total,
        category: x.category,
        warnings: x.warnings,
        lineItems: {
          create: x.lineItems.map((item, position) => ({ position, ...item })),
        },
      },
    }),
  ]);
}

export function parseIsoDate(value: string | null | undefined): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}
