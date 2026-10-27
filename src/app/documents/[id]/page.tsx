import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getDocument } from "@/lib/documents";
import { formatMoney } from "@/lib/format";
import { StatusBadge } from "@/components/status-badge";
import { AutoRefresh } from "@/components/auto-refresh";
import { deleteDocument, retryDocument } from "@/app/actions";
import { CorrectionForm } from "./correction-form";

export default function DocumentPage({ params }: PageProps<"/documents/[id]">) {
  return (
    <Suspense fallback={<p className="text-sm text-muted">Loading…</p>}>
      <DocumentDetail params={params} />
    </Suspense>
  );
}

async function DocumentDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const doc = await getDocument(id);
  if (!doc) notFound();

  const fileUrl = `/api/documents/${doc.id}/file`;

  return (
    <div className="space-y-6">
      <AutoRefresh active={doc.status === "PROCESSING"} />

      <div className="flex flex-wrap items-center gap-3">
        <Link href="/documents" className="text-sm text-muted hover:text-foreground">
          ← Documents
        </Link>
        <h1 className="min-w-0 flex-1 truncate text-xl font-semibold tracking-tight">
          {doc.vendorName ?? doc.fileName}
        </h1>
        <StatusBadge status={doc.status} reviewed={doc.reviewed} />
        {doc.status !== "PROCESSING" && (
          <form action={retryDocument.bind(null, doc.id)}>
            <button className="btn-secondary">Re-extract</button>
          </form>
        )}
        <form action={deleteDocument.bind(null, doc.id)}>
          <button className="btn-secondary text-danger">Delete</button>
        </form>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card overflow-hidden">
          {doc.mimeType === "application/pdf" ? (
            <iframe src={fileUrl} title={doc.fileName} className="h-[75vh] w-full" />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element -- user upload served from our API
            <img src={fileUrl} alt={doc.fileName} className="max-h-[75vh] w-full object-contain" />
          )}
        </div>

        <div className="space-y-6">
          {doc.status === "PROCESSING" && (
            <div className="card p-6 text-sm text-muted">Extracting…</div>
          )}

          {doc.status === "FAILED" && (
            <div className="card border-danger/40 p-4 text-sm text-danger">{doc.error}</div>
          )}

          {doc.warnings.length > 0 && (
            <ul className="card list-disc space-y-1 border-warning/40 p-4 pl-8 text-sm text-warning">
              {doc.warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          )}

          {doc.status === "READY" && (
            <>
              <CorrectionForm
                id={doc.id}
                values={{
                  vendorName: doc.vendorName,
                  documentNumber: doc.documentNumber,
                  issueDate: doc.issueDate,
                  dueDate: doc.dueDate,
                  currency: doc.currency,
                  subtotal: doc.subtotal?.toNumber() ?? null,
                  tax: doc.tax?.toNumber() ?? null,
                  total: doc.total?.toNumber() ?? null,
                  category: doc.category,
                }}
              />

              {doc.lineItems.length > 0 && (
                <div className="card overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b border-line text-left text-xs text-muted">
                      <tr>
                        <th className="px-4 py-2 font-medium">Item</th>
                        <th className="px-4 py-2 text-right font-medium">Qty</th>
                        <th className="px-4 py-2 text-right font-medium">Unit</th>
                        <th className="px-4 py-2 text-right font-medium">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {doc.lineItems.map((item) => (
                        <tr key={item.id}>
                          <td className="px-4 py-2">{item.description}</td>
                          <td className="px-4 py-2 text-right tabular-nums">
                            {item.quantity?.toString() ?? "—"}
                          </td>
                          <td className="whitespace-nowrap px-4 py-2 text-right font-mono tabular-nums">
                            {formatMoney(item.unitPrice, doc.currency)}
                          </td>
                          <td className="whitespace-nowrap px-4 py-2 text-right font-mono tabular-nums">
                            {formatMoney(item.amount, doc.currency)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
