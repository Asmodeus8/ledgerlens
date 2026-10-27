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
