import "server-only";
import { createHash } from "node:crypto";
import type { Category } from "@/lib/categories";
import type { Extraction } from "@/lib/extraction";

export const DEMO_WARNING = "Demo mode: sample data, not read from this file";

type Template = {
  vendor: string;
  type: Extraction["documentType"];
  prefix: string;
  category: Category;
  vat: boolean;
  items: [description: string, min: number, max: number][];
};

const TEMPLATES: Template[] = [
  {
    vendor: "Shoprite Lekki",
    type: "receipt",
    prefix: "A",
    category: "Food & Dining",
    vat: true,
    items: [
      ["Bread", 1200, 1800],
      ["Milk 1L", 2800, 3400],
      ["Rice 5kg", 16000, 21000],
      ["Eggs, crate", 5500, 7000],
      ["Bottled water, pack", 2400, 3200],
    ],
  },
  {
    vendor: "Ikeja Electric",
    type: "bill",
    prefix: "IE",
    category: "Utilities",
    vat: true,
    items: [["Prepaid units", 20000, 60000]],
  },
  {
    vendor: "MTN Nigeria",
    type: "receipt",
    prefix: "MTN",
    category: "Utilities",
    vat: true,
    items: [["Data bundle", 10000, 30000]],
  },
  {
    vendor: "Bolt",
    type: "receipt",
    prefix: "BLT",
    category: "Transport",
    vat: false,
    items: [["Ride", 3500, 12000]],
  },
  {
    vendor: "Jumia",
    type: "receipt",
    prefix: "JUM",
    category: "Office Supplies",
    vat: false,
    items: [
      ["A4 paper, 5 reams", 19000, 24000],
      ["Desk lamp", 15000, 22000],
      ["Stapler", 3500, 5500],
      ["Notebooks, pack of 5", 6000, 9000],
    ],
  },
  {
    vendor: "Okafor & Co",
    type: "invoice",
    prefix: "OC",
    category: "Professional Services",
    vat: true,
    items: [
      ["Monthly bookkeeping", 80000, 130000],
      ["VAT filing", 30000, 40000],
    ],
  },
  {
    vendor: "Chicken Republic",
    type: "receipt",
    prefix: "CR",
    category: "Food & Dining",
    vat: true,
    items: [
      ["Refuel max", 3200, 3800],
      ["Water 75cl", 350, 500],
      ["Chicken & chips", 4500, 6000],
    ],
  },
];

/** Plausible, stable extraction for a file, used when no AI provider is configured. */
export async function demoExtraction(data: Buffer): Promise<Extraction> {
  const random = seededRandom(createHash("sha256").update(data).digest());
  const pick = <T,>(list: T[]) => list[Math.floor(random() * list.length)];
  const between = (min: number, max: number) => Math.round((min + random() * (max - min)) / 50) * 50;

  const template = pick(TEMPLATES);
  const count = Math.min(template.items.length, 1 + Math.floor(random() * 3));
  const chosen = [...template.items].sort(() => random() - 0.5).slice(0, count);
  const lineItems = chosen.map(([description, min, max]) => {
    const quantity = max < 6000 ? 1 + Math.floor(random() * 3) : 1;
    const unitPrice = between(min, max);
    return { description, quantity, unitPrice, amount: quantity * unitPrice };
  });

  const subtotal = lineItems.reduce((sum, item) => sum + item.amount, 0);
  const tax = template.vat ? Math.round(subtotal * 0.075 * 100) / 100 : null;
  const issued = new Date();
  issued.setUTCDate(issued.getUTCDate() - Math.floor(random() * 10));

  // Long enough to see the processing state, short enough not to drag.
  await new Promise((resolve) => setTimeout(resolve, 1500 + random() * 1500));

  return {
    documentType: template.type,
    vendorName: template.vendor,
    documentNumber: `${template.prefix}-${Math.floor(10000 + random() * 89999)}`,
    issueDate: issued.toISOString().slice(0, 10),
    dueDate: null,
    currency: "NGN",
    subtotal,
    tax,
    total: subtotal + (tax ?? 0),
    category: template.category,
    lineItems,
    warnings: [DEMO_WARNING],
  };
}

// mulberry32, seeded from the file hash.
function seededRandom(seed: Buffer) {
  let state = seed.readUInt32LE(0);
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
