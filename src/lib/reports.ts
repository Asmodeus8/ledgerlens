export type ReportDocument = {
  id: string;
  fileName: string;
  vendorName: string | null;
  documentNumber: string | null;
  issueDate: Date | null;
  currency: string | null;
  subtotal: number | null;
  tax: number | null;
  total: number | null;
  category: string | null;
};

export type CurrencyTotals = {
  currency: string;
  total: number;
  count: number;
  byCategory: { category: string; total: number }[];
  byMonth: { month: string; total: number }[];
};

const UNKNOWN_CURRENCY = "—";

/**
 * Totals are grouped per currency first: adding NGN and USD amounts together
 * would produce a meaningless number.
 */
export function summarize(docs: ReportDocument[]): CurrencyTotals[] {
  const groups = new Map<string, ReportDocument[]>();
  for (const doc of docs) {
    if (doc.total == null) continue;
    const key = doc.currency ?? UNKNOWN_CURRENCY;
    const group = groups.get(key) ?? [];
    group.push(doc);
    groups.set(key, group);
  }

  return [...groups.entries()]
    .map(([currency, group]) => {
      const byCategory = new Map<string, number>();
      const byMonth = new Map<string, number>();
      let total = 0;
      for (const doc of group) {
        const amount = doc.total!;
        total += amount;
        const category = doc.category ?? "Other";
        byCategory.set(category, (byCategory.get(category) ?? 0) + amount);
        if (doc.issueDate) {
          const month = doc.issueDate.toISOString().slice(0, 7);
          byMonth.set(month, (byMonth.get(month) ?? 0) + amount);
        }
      }
      return {
        currency,
        total: round2(total),
        count: group.length,
        byCategory: [...byCategory.entries()]
          .map(([category, t]) => ({ category, total: round2(t) }))
          .sort((a, b) => b.total - a.total),
        byMonth: [...byMonth.entries()]
          .map(([month, t]) => ({ month, total: round2(t) }))
          .sort((a, b) => a.month.localeCompare(b.month)),
      };
    })
    .sort((a, b) => b.count - a.count);
}

export type MonthPoint = { month: string; total: number };

function monthKey(date: Date): string {
  return date.toISOString().slice(0, 7);
}

/**
 * The last `count` calendar months ending at `now`, oldest first, with empty
 * months as zero so a gap in spending shows as a gap rather than disappearing.
 */
export function lastMonths(byMonth: MonthPoint[], now: Date, count = 6): MonthPoint[] {
  const totals = new Map(byMonth.map((m) => [m.month, m.total]));
  const points: MonthPoint[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    const month = monthKey(d);
    points.push({ month, total: totals.get(month) ?? 0 });
  }
  return points;
}

/** Percentage change, or null when there's no baseline to compare against. */
export function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}

const CSV_COLUMNS: { header: string; value: (d: ReportDocument) => unknown }[] = [
  { header: "Date", value: (d) => d.issueDate?.toISOString().slice(0, 10) },
  { header: "Vendor", value: (d) => d.vendorName },
  { header: "Document number", value: (d) => d.documentNumber },
  { header: "Category", value: (d) => d.category },
  { header: "Currency", value: (d) => d.currency },
  { header: "Subtotal", value: (d) => d.subtotal },
  { header: "Tax", value: (d) => d.tax },
  { header: "Total", value: (d) => d.total },
  { header: "File", value: (d) => d.fileName },
];

export function toCsv(docs: ReportDocument[]): string {
  const rows = [
    CSV_COLUMNS.map((c) => c.header),
    ...docs.map((d) => CSV_COLUMNS.map((c) => c.value(d))),
  ];
  return rows.map((row) => row.map(csvCell).join(",")).join("\r\n") + "\r\n";
}

function csvCell(value: unknown): string {
  if (value == null) return "";
  let text = String(value);
  // Stop spreadsheet apps from treating a vendor name like "=HYPERLINK(...)" as a formula.
  if (/^[=+\-@\t\r]/.test(text) && typeof value === "string") text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
