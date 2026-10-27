import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { listDocuments } from "@/lib/documents";
import { formatDate, formatMoney } from "@/lib/format";
import { StatusBadge } from "@/components/status-badge";
import { AutoRefresh } from "@/components/auto-refresh";

export const metadata: Metadata = { title: "Documents" };

export default function DocumentsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Documents</h1>
      <Suspense fallback={<p className="text-sm text-muted">Loading…</p>}>
        <DocumentTable />
      </Suspense>
    </div>
  );
}

async function DocumentTable() {
  const docs = await listDocuments();
  if (docs.length === 0) {
    return (
      <div className="card p-10 text-center">
        <p className="mb-4 text-muted">No documents yet.</p>
        <Link href="/upload" className="btn-primary">
          Upload
        </Link>
      </div>
    );
  }

  return (
    <div className="card overflow-x-auto">
      <AutoRefresh active={docs.some((d) => d.status === "PROCESSING")} />
      <table className="w-full text-sm">
        <thead className="border-b border-line text-left text-xs text-muted">
          <tr>
            <th className="px-4 py-2 font-medium">Vendor</th>
            <th className="px-4 py-2 font-medium">Date</th>
            <th className="px-4 py-2 font-medium">Category</th>
            <th className="px-4 py-2 text-right font-medium">Total</th>
            <th className="px-4 py-2 font-medium">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {docs.map((doc) => (
            <tr key={doc.id} className="hover:bg-background">
              <td className="max-w-xs px-4 py-2.5">
                <Link href={`/documents/${doc.id}`} className="block truncate hover:underline">
                  {doc.vendorName ?? doc.fileName}
                </Link>
              </td>
              <td className="whitespace-nowrap px-4 py-2.5 text-muted">{formatDate(doc.issueDate)}</td>
              <td className="whitespace-nowrap px-4 py-2.5">{doc.category ?? "—"}</td>
              <td className="whitespace-nowrap px-4 py-2.5 text-right font-mono tabular-nums">
                {formatMoney(doc.total, doc.currency)}
              </td>
              <td className="px-4 py-2.5">
                <StatusBadge status={doc.status} reviewed={doc.reviewed} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
