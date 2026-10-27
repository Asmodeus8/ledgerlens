import "server-only";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import {
  extractDocument,
  ExtractionError,
  isSupportedMimeType,
  type Extraction,
} from "@/lib/extraction";
import { getObject } from "@/lib/storage";
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
  warnings: true,
} satisfies Prisma.DocumentSelect;

export const DOCUMENT_FILTERS = ["all", "review", "processing", "failed"] as const;
export type DocumentFilter = (typeof DOCUMENT_FILTERS)[number];

const filterWhere: Record<DocumentFilter, Prisma.DocumentWhereInput> = {
  all: {},
  review: { status: "READY", reviewed: false },
  processing: { status: "PROCESSING" },
  failed: { status: "FAILED" },
};

export async function listDocuments({
  query = "",
  filter = "all",
}: { query?: string; filter?: DocumentFilter } = {}) {
  const user = await requireUser();
  const q = query.trim().slice(0, 100);
  return prisma.document.findMany({
    where: {
      userId: user.id,
      ...filterWhere[filter],
      ...(q && {
        OR: [
          { vendorName: { contains: q, mode: "insensitive" } },
          { fileName: { contains: q, mode: "insensitive" } },
          { documentNumber: { contains: q, mode: "insensitive" } },
          { category: { contains: q, mode: "insensitive" } },
        ],
      }),
    },
    select: listSelect,
    orderBy: { createdAt: "desc" },
    take: 200,
  });
}

export async function countDocuments() {
  const user = await requireUser();
  return prisma.document.count({ where: { userId: user.id } });
}

/** Documents waiting on the user: extracted but not yet checked, and failures. */
export async function getAttention() {
  const user = await requireUser();
  const [toReview, toReviewCount, processing, failed] = await Promise.all([
    prisma.document.findMany({
      where: { userId: user.id, status: "READY", reviewed: false },
      select: {
        id: true,
        fileName: true,
        vendorName: true,
        total: true,
        currency: true,
        issueDate: true,
        warnings: true,
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.document.count({ where: { userId: user.id, status: "READY", reviewed: false } }),
    prisma.document.count({ where: { userId: user.id, status: "PROCESSING" } }),
    prisma.document.count({ where: { userId: user.id, status: "FAILED" } }),
  ]);
  return { toReview, toReviewCount, processing, failed };
}

export async function getDocument(id: string) {
  const user = await requireUser();
  return prisma.document.findFirst({
    where: { id, userId: user.id },
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
    select: { storageKey: true, mimeType: true },
  });
  if (!doc) return;

  try {
    if (!isSupportedMimeType(doc.mimeType)) {
      throw new ExtractionError(`Unsupported file type: ${doc.mimeType}`);
    }
    const data = await getObject(doc.storageKey);
    if (!data) throw new ExtractionError("The uploaded file is missing from storage.");
    const extraction = await extractDocument(Buffer.from(data), doc.mimeType);
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
