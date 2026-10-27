import Link from "next/link";
import { Suspense } from "react";
import { getReportDocuments } from "@/lib/documents";
import { summarize, type CurrencyTotals } from "@/lib/reports";
import { formatDate, formatMoney, formatMonth } from "@/lib/format";

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
      <Suspense fallback={<p className="text-sm text-muted">Loading…</p>}>
        <Dashboard />
      </Suspense>
    </div>
  );
}

async function Dashboard() {
  const docs = await getReportDocuments();
  if (docs.length === 0) {
    return (
      <div className="card p-10 text-center">
        <p className="mb-4 text-muted">No documents yet.</p>
        <Link href="/upload" className="btn-primary">
          Upload a receipt or invoice
        </Link>
      </div>
    );
  }

  const groups = summarize(docs);
  return (
    <div className="space-y-10">
      {groups.map((group) => (
        <CurrencySection key={group.currency} group={group} />
      ))}
      <section>
        <h2 className="mb-3 text-sm font-medium text-muted">Recent</h2>
        <ul className="card divide-y divide-line">
          {docs.slice(0, 6).map((doc) => (
            <li key={doc.id}>
              <Link
                href={`/documents/${doc.id}`}
                className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-background"
              >
                <span className="truncate">{doc.vendorName ?? doc.fileName}</span>
                <span className="flex shrink-0 gap-6 text-sm">
                  <span className="text-muted">{formatDate(doc.issueDate)}</span>
                  <span className="w-32 text-right font-mono tabular-nums">
                    {formatMoney(doc.total, doc.currency)}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function CurrencySection({ group }: { group: CurrencyTotals }) {
  const maxCategory = Math.max(...group.byCategory.map((c) => c.total), 1);
  const recentMonths = group.byMonth.slice(-6);
  const maxMonth = Math.max(...recentMonths.map((m) => m.total), 1);

  return (
    <section className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label={`Total spend (${group.currency})`} value={formatMoney(group.total, group.currency)} />
        <Stat label="Documents" value={String(group.count)} />
        <Stat
          label="Top category"
          value={group.byCategory[0]?.category ?? "—"}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card p-4">
          <h2 className="mb-4 text-sm font-medium text-muted">By category</h2>
          <ul className="space-y-3">
            {group.byCategory.map((c) => (
              <li key={c.category} className="text-sm">
                <div className="mb-1 flex justify-between gap-4">
                  <span>{c.category}</span>
                  <span className="font-mono tabular-nums">{formatMoney(c.total, group.currency)}</span>
                </div>
                <div className="h-1.5 rounded-full bg-line">
                  <div
                    className="h-1.5 rounded-full bg-accent"
                    style={{ width: `${(c.total / maxCategory) * 100}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="card p-4">
          <h2 className="mb-4 text-sm font-medium text-muted">By month</h2>
          {recentMonths.length === 0 ? (
            <p className="text-sm text-muted">No dated documents.</p>
          ) : (
            <div className="flex h-48 items-end gap-3">
              {recentMonths.map((m) => (
                <div key={m.month} className="flex h-full flex-1 flex-col justify-end gap-2 text-center">
                  <div
                    className="rounded-t bg-accent"
                    style={{ height: `${Math.max((m.total / maxMonth) * 100, 2)}%` }}
                    title={formatMoney(m.total, group.currency)}
                  />
                  <span className="text-xs text-muted">{formatMonth(m.month)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card p-4">
      <p className="text-xs font-medium text-muted">{label}</p>
      <p className="mt-1 truncate text-xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}
