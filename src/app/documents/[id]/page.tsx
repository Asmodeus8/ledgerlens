import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import {
  ChevronLeft,
  CircleAlert,
  CircleCheck,
  ExternalLink,
  LoaderCircle,
  RotateCw,
  TriangleAlert,
} from "lucide-react";
import { getDocument } from "@/lib/documents";
import { formatDate, formatMoney } from "@/lib/format";
import { StatusBadge } from "@/components/status-badge";
import { AutoRefresh } from "@/components/auto-refresh";
import { SubmitButton } from "@/components/submit-button";
import { retryDocument } from "@/app/actions";
import { CorrectionForm } from "./correction-form";
import { DeleteButton } from "./delete-button";

export default function DocumentPage({ params }: PageProps<"/documents/[id]">) {
  return (
    <Suspense fallback={<DetailSkeleton />}>
      <DocumentDetail params={params} />
    </Suspense>
  );
}

type Doc = NonNullable<Awaited<ReturnType<typeof getDocument>>>;

async function DocumentDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const doc = await getDocument(id);
  if (!doc) notFound();

  const fileUrl = `/api/documents/${doc.id}/file`;
  const title = doc.vendorName ?? doc.fileName;

  return (
    <div className="animate-rise">
      <AutoRefresh active={doc.status === "PROCESSING"} />

      <Link
        href="/documents"
        className="-ml-1 mb-4 inline-flex items-center gap-1 rounded-md px-1 text-sm text-muted hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden />
        Documents
      </Link>

      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="truncate text-2xl font-semibold tracking-tight">{title}</h1>
            <StatusBadge status={doc.status} reviewed={doc.reviewed} />
          </div>
          {doc.status === "READY" && (
            <p className="mt-1.5 flex flex-wrap items-center gap-x-2 text-sm text-muted">
              <span className="money font-medium text-foreground">{formatMoney(doc.total, doc.currency)}</span>
              <span aria-hidden>·</span>
              <span>{formatDate(doc.issueDate)}</span>
              {doc.category && (
                <>
                  <span aria-hidden>·</span>
                  <span>{doc.category}</span>
                </>
              )}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1">
          {doc.status === "READY" && (
            <form action={retryDocument.bind(null, doc.id)}>
              <SubmitButton className="btn-secondary" pendingLabel="Starting…">
                <RotateCw className="h-4 w-4" aria-hidden />
                Re-extract
              </SubmitButton>
            </form>
          )}
          <DeleteButton id={doc.id} name={doc.fileName} />
        </div>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <section className="card overflow-hidden lg:sticky lg:top-20" aria-label="Original document">
          <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
            <p className="truncate text-xs text-muted">{doc.fileName}</p>
            <a
              href={fileUrl}
              target="_blank"
              rel="noopener"
              className="inline-flex items-center gap-1 text-xs text-muted hover:text-foreground"
            >
              Open
              <ExternalLink className="h-3.5 w-3.5" aria-hidden />
            </a>
          </div>
          <div className="bg-surface-2/60">
            {doc.mimeType === "application/pdf" ? (
              <iframe src={`${fileUrl}#navpanes=0&view=FitH`} title={doc.fileName} className="h-[70vh] w-full" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element -- user upload served from our API
              <img src={fileUrl} alt={doc.fileName} className="mx-auto max-h-[70vh] w-auto object-contain" />
            )}
          </div>
        </section>

        <div className="space-y-5">
          {doc.status === "PROCESSING" && <Processing />}
          {doc.status === "FAILED" && <Failed doc={doc} />}
          {doc.warnings.length > 0 && <Warnings warnings={doc.warnings} reviewed={doc.reviewed} />}
          {doc.status === "READY" && (
            <>
              <CorrectionForm
                id={doc.id}
                reviewed={doc.reviewed}
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
              {doc.lineItems.length > 0 && <LineItems doc={doc} />}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Processing() {
  return (
    <div className="card p-5" role="status">
      <p className="flex items-center gap-2 text-sm font-medium">
        <LoaderCircle className="h-4 w-4 animate-spin text-accent" aria-hidden />
        Reading document
      </p>
      <div className="mt-5 grid gap-4 sm:grid-cols-2" aria-hidden>
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className={i === 0 ? "sm:col-span-2" : undefined}>
            <div className="skeleton mb-2 h-3 w-20" />
            <div className="skeleton h-9 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

function Failed({ doc }: { doc: Doc }) {
  return (
    <div role="alert" className="flex gap-3 rounded-xl border border-danger/25 bg-danger-soft p-4">
      <CircleAlert className="mt-0.5 h-5 w-5 shrink-0 text-danger" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="font-medium text-danger">Extraction failed</p>
        <p className="mt-0.5 text-sm text-danger/90">{doc.error}</p>
      </div>
      <form action={retryDocument.bind(null, doc.id)}>
        <SubmitButton className="btn-secondary h-8" pendingLabel="Starting…">
          Try again
        </SubmitButton>
      </form>
    </div>
  );
}

function Warnings({ warnings, reviewed }: { warnings: string[]; reviewed: boolean }) {
  // Once someone has reviewed the document, the flags are history, not a call to action.
  return (
    <div
      className={`flex gap-3 rounded-xl border p-4 ${
        reviewed ? "border-line bg-surface-2/60" : "border-warning/25 bg-warning-soft"
      }`}
    >
      <TriangleAlert className={`mt-0.5 h-5 w-5 shrink-0 ${reviewed ? "text-subtle" : "text-warning"}`} aria-hidden />
      <div className="min-w-0">
        <p className={`font-medium ${reviewed ? "text-muted" : "text-warning"}`}>
          {reviewed ? "Flagged during extraction" : "Check before confirming"}
        </p>
        <ul className="mt-1 space-y-1 text-sm text-foreground/80">
          {warnings.map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function LineItems({ doc }: { doc: Doc }) {
  const sum = doc.lineItems.reduce((acc, item) => acc + (item.amount?.toNumber() ?? 0), 0);
  const target = doc.subtotal?.toNumber() ?? doc.total?.toNumber() ?? null;
  const targetLabel = doc.subtotal ? "subtotal" : "total";
  const matches = target !== null && Math.abs(sum - target) < 0.01;

  return (
    <section className="card overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-5 py-3.5">
        <h2 className="text-sm font-medium">
          Line items <span className="text-muted">{doc.lineItems.length}</span>
        </h2>
        {target !== null && (
          <span
            className={`inline-flex items-center gap-1.5 text-xs font-medium ${matches ? "text-accent" : "text-warning"}`}
          >
            {matches ? <CircleCheck className="h-3.5 w-3.5" aria-hidden /> : <TriangleAlert className="h-3.5 w-3.5" aria-hidden />}
            {matches ? `Matches ${targetLabel}` : `${formatMoney(Math.abs(sum - target), doc.currency)} off ${targetLabel}`}
          </span>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-y border-line bg-surface-2/50 text-left text-xs text-muted">
              <th className="py-2 pr-3 pl-5 font-medium">Item</th>
              <th className="px-3 py-2 text-right font-medium">Qty</th>
              <th className="px-3 py-2 text-right font-medium">Unit price</th>
              <th className="py-2 pr-5 pl-3 text-right font-medium">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {doc.lineItems.map((item) => (
              <tr key={item.id}>
                <td className="py-2.5 pr-3 pl-5">{item.description}</td>
                <td className="px-3 py-2.5 text-right text-muted tabular-nums">{item.quantity?.toString() ?? "—"}</td>
                <td className="money px-3 py-2.5 text-right whitespace-nowrap text-muted">
                  {formatMoney(item.unitPrice, doc.currency)}
                </td>
                <td className="money py-2.5 pr-5 pl-3 text-right whitespace-nowrap">{formatMoney(item.amount, doc.currency)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-line-strong">
              <td colSpan={3} className="py-2.5 pr-3 pl-5 text-right text-xs font-medium text-muted">
                Items total
              </td>
              <td className="money py-2.5 pr-5 pl-3 text-right font-semibold whitespace-nowrap">
                {formatMoney(sum, doc.currency)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  );
}

function DetailSkeleton() {
  return (
    <div>
      <div className="skeleton mb-4 h-4 w-24" />
      <div className="skeleton mb-8 h-8 w-64" />
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="skeleton h-[60vh] rounded-xl" />
        <div className="card space-y-4 p-5">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="skeleton h-9 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}
