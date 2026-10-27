import Link from "next/link";
import { Suspense } from "react";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  CircleAlert,
  CircleDashed,
  FileText,
  LoaderCircle,
  Upload,
} from "lucide-react";
import { getAttention, getReportDocuments } from "@/lib/documents";
import { lastMonths, percentChange, summarize, type CurrencyTotals } from "@/lib/reports";
import { formatDate, formatMoney, formatMonth, formatMonthShort } from "@/lib/format";
import { ColumnChart } from "@/components/charts";
import { EmptyState, PageHeader } from "@/components/ui";

export default function OverviewPage({ searchParams }: PageProps<"/">) {
  return (
    <Suspense fallback={<OverviewSkeleton />}>
      <Overview searchParams={searchParams} />
    </Suspense>
  );
}

async function Overview({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [{ currency: requested }, docs, attention] = await Promise.all([
    searchParams,
    getReportDocuments(),
    getAttention(),
  ]);
  const groups = summarize(docs);
  const now = new Date();
  const monthName = new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" }).format(now);

  if (groups.length === 0) {
    return (
      <>
        <PageHeader title="Overview" description={monthName} />
        {attention.processing + attention.failed > 0 ? (
          <AttentionCard attention={attention} />
        ) : (
          <EmptyState
            icon={Upload}
            title="Upload your first receipt or invoice"
            action={
              <Link href="/upload" className="btn-primary">
                <Upload className="h-4 w-4" aria-hidden />
                Upload
              </Link>
            }
          />
        )}
      </>
    );
  }

  const group = groups.find((g) => g.currency === requested) ?? groups[0];

  return (
    <>
      <PageHeader
        title="Overview"
        description={monthName}
        actions={groups.length > 1 && <CurrencySwitch groups={groups} active={group.currency} />}
      />
      {/* Two independent columns on desktop; on small screens the wrappers dissolve
          (display: contents) so the most actionable card comes second. */}
      <div className="grid items-start gap-5 lg:grid-cols-3">
        <div className="contents lg:col-span-2 lg:grid lg:gap-5">
          <SpendCard group={group} now={now} className="order-1" />
          <RecentCard
            docs={docs.filter((d) => (d.currency ?? "—") === group.currency).slice(0, 6)}
            className="order-3"
          />
        </div>
        <div className="contents lg:grid lg:gap-5">
          <AttentionCard attention={attention} className="order-2" />
          <CategoryCard group={group} className="order-4" />
        </div>
      </div>
    </>
  );
}

function CurrencySwitch({ groups, active }: { groups: CurrencyTotals[]; active: string }) {
  return (
    <div className="flex rounded-lg border border-line bg-surface p-0.5 shadow-sm" role="tablist" aria-label="Currency">
      {groups.map((g) => (
        <Link
          key={g.currency}
          role="tab"
          aria-selected={g.currency === active}
          href={`/?currency=${encodeURIComponent(g.currency)}`}
          className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${
            g.currency === active ? "bg-surface-2 text-foreground" : "text-muted hover:text-foreground"
          }`}
        >
          {g.currency}
        </Link>
      ))}
    </div>
  );
}

function SpendCard({ group, now, className }: { group: CurrencyTotals; now: Date; className?: string }) {
  const months = lastMonths(group.byMonth, now, 6);
  const current = months[months.length - 1];
  const previous = months[months.length - 2];
  const change = percentChange(current.total, previous.total);
  const sixMonthTotal = months.reduce((sum, m) => sum + m.total, 0);

  return (
    <section className={`card p-5 sm:p-6 ${className ?? ""}`}>
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div>
          <p className="eyebrow">Spent in {formatMonth(current.month).split(" ")[0]}</p>
          <p className="mt-2 text-4xl font-semibold tracking-tight sm:text-5xl">
            {formatMoney(current.total, group.currency)}
          </p>
          <p className="mt-3 flex items-center gap-1.5 text-sm text-muted">
            {change === null ? (
              <>Nothing recorded in {formatMonthShort(previous.month)}</>
            ) : (
              <>
                <span className="inline-flex items-center gap-0.5 rounded-md bg-surface-2 px-1.5 py-0.5 font-medium text-foreground">
                  {change >= 0 ? (
                    <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
                  ) : (
                    <ArrowDownRight className="h-3.5 w-3.5" aria-hidden />
                  )}
                  {Math.abs(change)}%
                </span>
                vs {formatMonthShort(previous.month)}
              </>
            )}
          </p>
        </div>
        <dl className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm">
          <dt className="eyebrow">Last 6 months</dt>
          <dt className="eyebrow">All time</dt>
          <dd className="font-semibold">{formatMoney(sixMonthTotal, group.currency)}</dd>
          <dd className="font-semibold">{formatMoney(group.total, group.currency)}</dd>
        </dl>
      </div>

      <div className="mt-8">
        <h2 className="mb-3 text-sm font-medium">Monthly spend</h2>
        <ColumnChart
          caption={`Monthly spend in ${group.currency}`}
          currency={group.currency}
          points={months.map((m) => ({
            key: m.month,
            label: formatMonthShort(m.month),
            fullLabel: formatMonth(m.month),
            value: m.total,
          }))}
        />
      </div>
    </section>
  );
}

type Attention = Awaited<ReturnType<typeof getAttention>>;

function AttentionCard({ attention, className = "" }: { attention: Attention; className?: string }) {
  const rows = [
    { key: "review", label: "To review", count: attention.toReviewCount, icon: CircleDashed, tone: "text-warning" },
    { key: "processing", label: "Processing", count: attention.processing, icon: LoaderCircle, tone: "text-muted" },
    { key: "failed", label: "Failed", count: attention.failed, icon: CircleAlert, tone: "text-danger" },
  ];

  return (
    <section className={`card flex flex-col p-5 sm:p-6 ${className}`}>
      <h2 className="text-sm font-medium">Needs attention</h2>
      <ul className="mt-4 grid grid-cols-3 gap-2">
        {rows.map(({ key, label, count, icon: Icon, tone }) => (
          <li key={key}>
            <Link
              href={`/documents?filter=${key}`}
              className="block rounded-lg border border-line px-3 py-2.5 transition-colors hover:border-line-strong hover:bg-surface-2"
            >
              <Icon
                className={`h-4 w-4 ${count > 0 ? tone : "text-subtle"} ${key === "processing" && count > 0 ? "animate-spin" : ""}`}
                aria-hidden
              />
              <p className="mt-2 text-xl font-semibold">{count}</p>
              <p className="text-xs text-muted">{label}</p>
            </Link>
          </li>
        ))}
      </ul>

      {attention.toReview.length > 0 ? (
        <ul className="mt-5 -mx-2 flex-1 space-y-0.5">
          {attention.toReview.slice(0, 4).map((doc) => (
            <li key={doc.id}>
              <Link
                href={`/documents/${doc.id}`}
                className="group flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-surface-2"
              >
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5 truncate text-sm font-medium">
                    <span className="truncate">{doc.vendorName ?? doc.fileName}</span>
                    {doc.warnings.length > 0 && (
                      <CircleAlert className="h-3.5 w-3.5 shrink-0 text-warning" aria-label="Has warnings" />
                    )}
                  </span>
                  <span className="block text-xs text-muted">{formatDate(doc.issueDate)}</span>
                </span>
                <span className="money text-sm">{formatMoney(doc.total, doc.currency)}</span>
                <ArrowRight className="h-4 w-4 text-subtle transition-transform group-hover:translate-x-0.5" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-5 flex flex-1 items-center justify-center rounded-lg border border-dashed border-line py-6 text-sm text-muted">
          All caught up
        </p>
      )}
    </section>
  );
}

function CategoryCard({ group, className = "" }: { group: CurrencyTotals; className?: string }) {
  const top = group.byCategory.slice(0, 6);
  const rest = group.byCategory.slice(6).reduce((sum, c) => sum + c.total, 0);
  const rows = rest > 0 ? [...top, { category: "Everything else", total: rest }] : top;
  const max = Math.max(...rows.map((r) => r.total), 1);

  return (
    <section className={`card p-5 sm:p-6 ${className}`}>
      <h2 className="text-sm font-medium">By category</h2>
      <ul className="mt-5 space-y-4">
        {rows.map((c) => {
          const share = group.total > 0 ? Math.round((c.total / group.total) * 100) : 0;
          return (
            <li key={c.category} title={`${c.category}: ${formatMoney(c.total, group.currency)}`}>
              <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
                <span className="truncate">{c.category}</span>
                <span className="shrink-0 text-muted">
                  <span className="money text-foreground">{formatMoney(c.total, group.currency)}</span>
                  <span className="ml-2 inline-block w-9 text-right text-xs tabular-nums">{share}%</span>
                </span>
              </div>
              <div
                className="h-2 rounded-r-[4px] bg-chart-1"
                style={{ width: `${Math.max((c.total / max) * 100, 1.5)}%` }}
                aria-hidden
              />
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function RecentCard({
  docs,
  className,
}: {
  docs: Awaited<ReturnType<typeof getReportDocuments>>;
  className?: string;
}) {
  return (
    <section className={`card p-5 sm:p-6 ${className ?? ""}`}>
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium">Recent</h2>
        <Link href="/documents" className="text-sm text-muted hover:text-foreground">
          View all
        </Link>
      </div>
      <ul className="-mx-2 mt-3 divide-y divide-line">
        {docs.map((doc) => (
          <li key={doc.id}>
            <Link href={`/documents/${doc.id}`} className="flex items-center gap-3 rounded-lg px-2 py-3 hover:bg-surface-2">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-surface-2 text-muted">
                <FileText className="h-4 w-4" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{doc.vendorName ?? doc.fileName}</span>
                <span className="block truncate text-xs text-muted">
                  {formatDate(doc.issueDate)} · {doc.category ?? "Uncategorised"}
                </span>
              </span>
              <span className="money text-sm">{formatMoney(doc.total, doc.currency)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function OverviewSkeleton() {
  return (
    <>
      <div className="mb-8 space-y-2">
        <div className="skeleton h-7 w-36" />
        <div className="skeleton h-4 w-28" />
      </div>
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="card space-y-4 p-6 lg:col-span-2">
          <div className="skeleton h-4 w-28" />
          <div className="skeleton h-12 w-64" />
          <div className="skeleton mt-8 h-56 w-full" />
        </div>
        <div className="card space-y-3 p-6">
          <div className="skeleton h-4 w-32" />
          <div className="skeleton h-20 w-full" />
          <div className="skeleton h-10 w-full" />
          <div className="skeleton h-10 w-full" />
        </div>
      </div>
    </>
  );
}
