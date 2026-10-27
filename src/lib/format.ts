type Numeric = number | { toNumber(): number } | null | undefined;

function toNumber(value: Numeric): number | null {
  if (value == null) return null;
  return typeof value === "number" ? value : value.toNumber();
}

export function formatMoney(value: Numeric, currency: string | null | undefined): string {
  const amount = toNumber(value);
  if (amount == null) return "—";
  if (currency && /^[A-Z]{3}$/.test(currency)) {
    try {
      return new Intl.NumberFormat("en-NG", { style: "currency", currency }).format(amount);
    } catch {
      // Unknown ISO code: fall through to a plain number with the code appended.
    }
  }
  const plain = new Intl.NumberFormat("en-NG", { minimumFractionDigits: 2 }).format(amount);
  return currency ? `${plain} ${currency}` : plain;
}

/** Short money for axis ticks and tight spaces: ₦25K, $1.2M. */
export function formatCompactMoney(amount: number, currency: string | null | undefined): string {
  if (currency && /^[A-Z]{3}$/.test(currency)) {
    try {
      return new Intl.NumberFormat("en-NG", {
        style: "currency",
        currency,
        notation: "compact",
        maximumFractionDigits: 1,
      }).format(amount);
    } catch {
      // fall through
    }
  }
  return new Intl.NumberFormat("en-NG", { notation: "compact", maximumFractionDigits: 1 }).format(amount);
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatMonthShort(month: string): string {
  return new Intl.DateTimeFormat("en-GB", { month: "short", timeZone: "UTC" }).format(
    new Date(`${month}-01T00:00:00Z`),
  );
}

export function formatDate(value: Date | null | undefined): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(value);
}

export function formatMonth(month: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${month}-01T00:00:00Z`));
}

/** Value for an <input type="date">. */
export function toDateInput(value: Date | null | undefined): string {
  return value ? value.toISOString().slice(0, 10) : "";
}

export function toAmountInput(value: Numeric): string {
  const amount = toNumber(value);
  return amount == null ? "" : String(amount);
}
