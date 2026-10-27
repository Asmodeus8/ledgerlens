import { describe, expect, it } from "vitest";
import { lastMonths, percentChange, summarize, toCsv, type ReportDocument } from "./reports";

function doc(overrides: Partial<ReportDocument>): ReportDocument {
  return {
    id: "1",
    fileName: "receipt.png",
    vendorName: "Shoprite",
    documentNumber: null,
    issueDate: new Date("2026-09-14"),
    currency: "NGN",
    subtotal: null,
    tax: null,
    total: 1000,
    category: "Food & Dining",
    ...overrides,
  };
}

describe("summarize", () => {
  it("keeps currencies apart", () => {
    const result = summarize([
      doc({ total: 1000 }),
      doc({ total: 2500.5 }),
      doc({ currency: "USD", total: 20 }),
    ]);
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ currency: "NGN", total: 3500.5, count: 2 });
    expect(result[1]).toMatchObject({ currency: "USD", total: 20, count: 1 });
  });

  it("groups by category and month, largest category first", () => {
    const [ngn] = summarize([
      doc({ total: 100, category: "Transport", issueDate: new Date("2026-08-02") }),
      doc({ total: 300, category: "Utilities", issueDate: new Date("2026-09-10") }),
      doc({ total: 50, category: "Transport", issueDate: new Date("2026-09-20") }),
    ]);
    expect(ngn.byCategory).toEqual([
      { category: "Utilities", total: 300 },
      { category: "Transport", total: 150 },
    ]);
    expect(ngn.byMonth).toEqual([
      { month: "2026-08", total: 100 },
      { month: "2026-09", total: 350 },
    ]);
  });

  it("skips documents without a total and avoids float drift", () => {
    const [ngn] = summarize([doc({ total: 0.1 }), doc({ total: 0.2 }), doc({ total: null })]);
    expect(ngn.total).toBe(0.3);
    expect(ngn.count).toBe(2);
  });
});

describe("toCsv", () => {
  it("quotes commas and quotes, and blanks nulls", () => {
    const csv = toCsv([doc({ vendorName: 'Mama "Put", Ikeja', tax: null })]);
    const [, row] = csv.trim().split("\r\n");
    expect(row).toBe('2026-09-14,"Mama ""Put"", Ikeja",,Food & Dining,NGN,,,1000,receipt.png');
  });

  it("neutralises spreadsheet formulas", () => {
    const csv = toCsv([doc({ vendorName: "=HYPERLINK(\"x\")" })]);
    expect(csv).toContain(`"'=HYPERLINK(""x"")"`);
  });
});

describe("lastMonths", () => {
  it("fills empty months with zero and crosses the year boundary", () => {
    const points = lastMonths(
      [
        { month: "2025-11", total: 50 },
        { month: "2026-01", total: 120 },
        { month: "2024-01", total: 999 },
      ],
      new Date("2026-02-15T12:00:00Z"),
      4,
    );
    expect(points).toEqual([
      { month: "2025-11", total: 50 },
      { month: "2025-12", total: 0 },
      { month: "2026-01", total: 120 },
      { month: "2026-02", total: 0 },
    ]);
  });
});

describe("percentChange", () => {
  it("rounds, signs, and refuses a zero baseline", () => {
    expect(percentChange(150, 100)).toBe(50);
    expect(percentChange(75, 100)).toBe(-25);
    expect(percentChange(10, 0)).toBeNull();
  });
});
