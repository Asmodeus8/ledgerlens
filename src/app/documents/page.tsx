import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { CircleAlert, FileText, SearchX, Upload } from "lucide-react";
import {
  countDocuments,
  DOCUMENT_FILTERS,
  listDocuments,
  type DocumentFilter,
} from "@/lib/documents";
import { formatDate, formatMoney } from "@/lib/format";
import { StatusBadge } from "@/components/status-badge";
import { AutoRefresh } from "@/components/auto-refresh";
import { EmptyState, PageHeader } from "@/components/ui";
import { SearchBox } from "./search-box";

export const metadata: Metadata = { title: "Documents" };

const FILTER_LABELS: Record<DocumentFilter, string> = {
  all: "All",
  review: "To review",
  processing: "Processing",
  failed: "Failed",
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default function DocumentsPage({ searchParams }: PageProps<"/documents">) {
  return (
    <>
      <PageHeader title="Documents" />
      <Suspense fallback={<TableSkeleton />}>
        <DocumentsView searchParams={searchParams} />
      </Suspense>
    </>
  );
}

function parseFilter(value: unknown): DocumentFilter {
  return (DOCUMENT_FILTERS as readonly unknown[]).includes(value) ? (value as DocumentFilter) : "all";
}

async function DocumentsView({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const filter = parseFilter(params.filter);
  const query = typeof params.q === "string" ? params.q : "";
  const [docs, total] = await Promise.all([listDocuments({ query, filter }), countDocuments()]);

  if (total === 0) {
    return (
      <EmptyState
        icon={FileText}
        title="No documents yet"
        action={
          <Link href="/upload" className="btn-primary">
            <Upload className="h-4 w-4" aria-hidden />
            Upload
          </Link>
        }
      />
    );
  }

  return (
    <>
      <AutoRefresh active={docs.some((d) => d.status === "PROCESSING")} />
      <div className="mb-4 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        <nav className="-mx-1 flex gap-1 overflow-x-auto px-1" aria-label="Filter documents">
          {DOCUMENT_FILTERS.map((f) => {
            const next = new URLSearchParams();
            if (f !== "all") next.set("filter", f);
            if (query) next.set("q", query);
            const qs = next.toString();
            return (
              <Link
                key={f}
                href={`/documents${qs ? `?${qs}` : ""}`}
                aria-current={f === filter ? "page" : undefined}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors ${
                  f === filter
                    ? "bg-surface text-foreground shadow-sm ring-1 ring-line"
                    : "text-muted hover:text-foreground"
                }`}
              >
                {FILTER_LABELS[f]}
              </Link>
            );
          })}
        </nav>
        <SearchBox />
      </div>

      {docs.length === 0 ? (
        <div className="card flex flex-col items-center py-14 text-center">
          <SearchX className="mb-3 h-6 w-6 text-subtle" aria-hidden />
          <p className="font-medium">No matches</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          {/* Desktop table */}
          <table className="hidden w-full table-fixed text-sm md:table">
            <colgroup>
              <col />
              <col className="w-32" />
              <col className="w-52" />
              <col className="w-36" />
              <col className="w-36" />
            </colgroup>
            <thead>
              <tr className="border-b border-line text-left text-xs text-muted">
                <th className="py-2.5 pr-3 pl-5 font-medium">Vendor</th>
                <th className="px-3 py-2.5 font-medium">Date</th>
                <th className="px-3 py-2.5 font-medium">Category</th>
                <th className="px-3 py-2.5 text-right font-medium">Total</th>
                <th className="py-2.5 pr-5 pl-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {docs.map((doc) => (
                <tr key={doc.id} className="group relative transition-colors hover:bg-surface-2/60">
                  <td className="py-3 pr-3 pl-5">
                    <Link
                      href={`/documents/${doc.id}`}
                      className="flex items-center gap-1.5 font-medium after:absolute after:inset-0 after:content-['']"
                    >
                      <span className="truncate">{doc.vendorName ?? doc.fileName}</span>
                      {doc.warnings.length > 0 && (
                        <CircleAlert className="h-3.5 w-3.5 shrink-0 text-warning" aria-label="Has warnings" />
                      )}
                    </Link>
                    {doc.vendorName && <p className="truncate text-xs text-muted">{doc.fileName}</p>}
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap text-muted">{formatDate(doc.issueDate)}</td>
                  <td className="truncate px-3 py-3">{doc.category ?? <span className="text-subtle">—</span>}</td>
                  <td className="money px-3 py-3 text-right whitespace-nowrap">{formatMoney(doc.total, doc.currency)}</td>
                  <td className="py-3 pr-5 pl-3">
                    <StatusBadge status={doc.status} reviewed={doc.reviewed} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Mobile list */}
          <ul className="divide-y divide-line md:hidden">
            {docs.map((doc) => (
              <li key={doc.id}>
                <Link href={`/documents/${doc.id}`} className="flex items-start gap-3 px-4 py-3.5 active:bg-surface-2">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{doc.vendorName ?? doc.fileName}</span>
                    <span className="mt-0.5 block truncate text-xs text-muted">
                      {formatDate(doc.issueDate)}
                      {doc.category && ` · ${doc.category}`}
                    </span>
                  </span>
                  <span className="flex flex-col items-end gap-1.5">
                    {doc.status === "READY" && (
                      <span className="money text-sm">{formatMoney(doc.total, doc.currency)}</span>
                    )}
                    <StatusBadge status={doc.status} reviewed={doc.reviewed} />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}

function TableSkeleton() {
  return (
    <div className="card divide-y divide-line">
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="flex items-center gap-4 px-5 py-4">
          <div className="flex-1 space-y-2">
            <div className="skeleton h-4 w-48" />
            <div className="skeleton h-3 w-32" />
          </div>
          <div className="skeleton h-4 w-20" />
          <div className="skeleton h-5 w-20 rounded-full" />
        </div>
      ))}
    </div>
  );
}
