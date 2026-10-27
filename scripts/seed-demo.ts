/**
 * Seeds a demo account with realistic, already-extracted documents.
 *
 *   npm run seed:demo
 *
 * Re-running replaces the demo account. Receipts are generated as simple PDFs so
 * the preview matches the extracted data.
 */
import "dotenv/config";
import { randomUUID } from "node:crypto";
import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { PrismaPg } from "@prisma/adapter-pg";
import { hashPassword } from "better-auth/crypto";
import { PrismaClient } from "../src/generated/prisma/client";

const DEMO_EMAIL = process.env.DEMO_EMAIL ?? "demo@ledgerlens.app";
const DEMO_PASSWORD = process.env.DEMO_PASSWORD ?? "demo-password";

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
const s3 = new S3Client({
  region: process.env.S3_REGION ?? "auto",
  endpoint: process.env.S3_ENDPOINT,
  forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID ?? "",
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? "",
  },
  requestChecksumCalculation: "WHEN_REQUIRED",
  responseChecksumValidation: "WHEN_REQUIRED",
});
const bucket = process.env.S3_BUCKET!;

type Item = [description: string, quantity: number, unitPrice: number];
type Seed = {
  vendor: string;
  type: "receipt" | "invoice" | "bill";
  number: string;
  monthsAgo: number;
  day: number;
  currency: string;
  category: string;
  items: Item[];
  vat?: number;
  reviewed?: boolean;
  warnings?: string[];
  /** Printed total differs from the items, to show the reconciliation check. */
  totalOverride?: number;
  failed?: string;
};

const SEEDS: Seed[] = [
  { vendor: "Shoprite Lekki", type: "receipt", number: "A-20931", monthsAgo: 0, day: 14, currency: "NGN", category: "Food & Dining", items: [["Bread", 2, 1200], ["Milk 1L", 1, 3100], ["Rice 5kg", 1, 18500]], vat: 0.075, reviewed: false, warnings: ["VAT line is partly faded; amount read as 1,800.00"] },
  { vendor: "Ikeja Electric", type: "bill", number: "IE-77810243", monthsAgo: 0, day: 3, currency: "NGN", category: "Utilities", items: [["Prepaid units 210 kWh", 1, 45000]], vat: 0.075, reviewed: true },
  { vendor: "Venia Hub", type: "invoice", number: "VH-2026-1004", monthsAgo: 0, day: 1, currency: "NGN", category: "Rent", items: [["Dedicated desk, October", 1, 150000], ["Meeting room hours", 4, 7500]], vat: 0.075, reviewed: true },
  { vendor: "Bolt", type: "receipt", number: "BLT-8841", monthsAgo: 0, day: 9, currency: "NGN", category: "Transport", items: [["Lekki → Victoria Island", 1, 6800]], reviewed: false },
  { vendor: "Figma", type: "invoice", number: "FIG-55120", monthsAgo: 0, day: 5, currency: "USD", category: "Software & Subscriptions", items: [["Professional plan, 1 editor", 1, 15]], reviewed: true },
  { vendor: "MTN Nigeria", type: "receipt", number: "MTN-310992", monthsAgo: 1, day: 22, currency: "NGN", category: "Utilities", items: [["Data bundle 75GB", 1, 20000]], vat: 0.075, reviewed: true },
  { vendor: "Air Peace", type: "invoice", number: "P47-KX2Q9", monthsAgo: 1, day: 12, currency: "NGN", category: "Travel", items: [["LOS → ABV economy", 1, 98000], ["LOS → ABV return", 1, 92000]], reviewed: true },
  { vendor: "Chicken Republic", type: "receipt", number: "CR-1187", monthsAgo: 1, day: 18, currency: "NGN", category: "Food & Dining", items: [["Refuel max", 3, 3500], ["Water 75cl", 3, 400]], vat: 0.075, reviewed: true, totalOverride: 12950, warnings: ["Printed total doesn't match the items"] },
  { vendor: "Venia Hub", type: "invoice", number: "VH-2026-0903", monthsAgo: 1, day: 1, currency: "NGN", category: "Rent", items: [["Dedicated desk, September", 1, 150000]], vat: 0.075, reviewed: true },
  { vendor: "Okafor & Co", type: "invoice", number: "OC-0412", monthsAgo: 2, day: 28, currency: "NGN", category: "Professional Services", items: [["Quarterly bookkeeping", 1, 120000], ["VAT filing", 1, 35000]], vat: 0.075, reviewed: true },
  { vendor: "Jumia", type: "receipt", number: "JUM-339201", monthsAgo: 2, day: 9, currency: "NGN", category: "Office Supplies", items: [["A4 paper, 5 reams", 1, 21500], ["Desk lamp", 1, 18900]], reviewed: true },
  { vendor: "Venia Hub", type: "invoice", number: "VH-2026-0802", monthsAgo: 2, day: 1, currency: "NGN", category: "Rent", items: [["Dedicated desk, August", 1, 150000]], vat: 0.075, reviewed: true },
  { vendor: "Slot", type: "receipt", number: "SLT-77120", monthsAgo: 3, day: 16, currency: "NGN", category: "Equipment", items: [["Logitech MX Keys", 1, 115000], ["USB-C hub", 1, 38000]], vat: 0.075, reviewed: true },
  { vendor: "Venia Hub", type: "invoice", number: "VH-2026-0701", monthsAgo: 3, day: 1, currency: "NGN", category: "Rent", items: [["Dedicated desk, July", 1, 150000]], vat: 0.075, reviewed: true },
  { vendor: "Google Ads", type: "invoice", number: "GA-5839201", monthsAgo: 4, day: 30, currency: "NGN", category: "Marketing", items: [["Search campaign, June", 1, 85000]], vat: 0.075, reviewed: true },
  { vendor: "Venia Hub", type: "invoice", number: "VH-2026-0601", monthsAgo: 4, day: 1, currency: "NGN", category: "Rent", items: [["Dedicated desk, June", 1, 140000]], vat: 0.075, reviewed: true },
  { vendor: "Uber", type: "receipt", number: "UBR-29110", monthsAgo: 5, day: 21, currency: "NGN", category: "Transport", items: [["Ikeja → Yaba", 1, 5400]], reviewed: true },
  { vendor: "Venia Hub", type: "invoice", number: "VH-2026-0501", monthsAgo: 5, day: 1, currency: "NGN", category: "Rent", items: [["Dedicated desk, May", 1, 140000]], vat: 0.075, reviewed: true },
  { vendor: "GitHub", type: "invoice", number: "GH-118204", monthsAgo: 1, day: 5, currency: "USD", category: "Software & Subscriptions", items: [["Team plan, 3 seats", 3, 4]], reviewed: true },
  { vendor: "Unknown", type: "receipt", number: "", monthsAgo: 0, day: 15, currency: "NGN", category: "Other", items: [["?", 1, 0]], failed: "The document didn't look like a receipt or invoice." },
];

const round2 = (n: number) => Math.round(n * 100) / 100;

function dateFor(monthsAgo: number, day: number): Date {
  const now = new Date();
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - monthsAgo, 1));
  const lastDay = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  // Never date a document in the future.
  const maxDay = monthsAgo === 0 ? now.getUTCDate() : lastDay;
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), Math.min(day, maxDay)));
}

/** A one-page PDF with monospaced text lines. Enough to render as a receipt. */
function receiptPdf(lines: string[]): Uint8Array {
  const esc = (s: string) => s.replace(/[\\()]/g, (c) => `\\${c}`).replace(/[^\x20-\x7e]/g, "?");
  const body = ["BT", "/F1 10 Tf", "14 TL", "36 380 Td"];
  for (const line of lines) body.push(`(${esc(line)}) Tj T*`);
  body.push("ET");
  const stream = body.join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 420] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>",
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
  ];
  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];
  objects.forEach((obj, i) => {
    offsets.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${obj}\nendobj\n`;
  });
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  pdf += offsets.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("");
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return new TextEncoder().encode(pdf);
}

function money(n: number) {
  return n.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

async function main() {
  const existing = await prisma.user.findUnique({
    where: { email: DEMO_EMAIL },
    include: { documents: { select: { storageKey: true } } },
  });
  if (existing) {
    await Promise.all(
      existing.documents.map((d) =>
        s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: d.storageKey })).catch(() => {}),
      ),
    );
    await prisma.user.delete({ where: { id: existing.id } });
  }

  const userId = randomUUID().replace(/-/g, "");
  await prisma.user.create({
    data: {
      id: userId,
      name: "Ada Okonkwo",
      email: DEMO_EMAIL,
      emailVerified: true,
      accounts: {
        create: {
          id: randomUUID().replace(/-/g, ""),
          accountId: userId,
          providerId: "credential",
          password: await hashPassword(DEMO_PASSWORD),
        },
      },
    },
  });

  for (const [index, seed] of SEEDS.entries()) {
    const issueDate = dateFor(seed.monthsAgo, seed.day);
    const subtotal = round2(seed.items.reduce((sum, [, q, p]) => sum + q * p, 0));
    const tax = seed.vat ? round2(subtotal * seed.vat) : 0;
    const total = seed.totalOverride ?? round2(subtotal + tax);
    const symbol = seed.currency === "USD" ? "$" : "NGN ";

    const lines = seed.failed
      ? ["", "  [smudged, unreadable]"]
      : [
          seed.vendor.toUpperCase(),
          `${seed.type === "invoice" ? "Invoice" : seed.type === "bill" ? "Bill" : "Receipt"} #${seed.number}`,
          `Date: ${issueDate.toISOString().slice(0, 10)}`,
          "",
          ...seed.items.map(([d, q, p]) => `${`${d}${q > 1 ? ` x${q}` : ""}`.slice(0, 24).padEnd(24)} ${money(q * p).padStart(12)}`),
          "",
          `${"Subtotal".padEnd(24)} ${money(subtotal).padStart(12)}`,
          ...(tax ? [`${`VAT ${(seed.vat! * 100).toFixed(1)}%`.padEnd(24)} ${money(tax).padStart(12)}`] : []),
          `${`TOTAL ${symbol.trim()}`.padEnd(24)} ${money(total).padStart(12)}`,
        ];

    const storageKey = `users/${userId}/${randomUUID()}`;
    const file = receiptPdf(lines);
    await s3.send(new PutObjectCommand({ Bucket: bucket, Key: storageKey, Body: file, ContentType: "application/pdf" }));

    const slug = seed.vendor.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    await prisma.document.create({
      data: {
        userId,
        fileName: seed.failed ? "IMG_4471.pdf" : `${slug}-${seed.number.toLowerCase() || index}.pdf`,
        mimeType: "application/pdf",
        fileSize: file.byteLength,
        storageKey,
        // Spread creation times so "recent" ordering looks natural.
        createdAt: new Date(issueDate.getTime() + 9 * 3600_000 + index * 60_000),
        ...(seed.failed
          ? { status: "FAILED", error: seed.failed }
          : {
              status: "READY",
              documentType: seed.type,
              vendorName: seed.vendor,
              documentNumber: seed.number,
              issueDate,
              dueDate: seed.type === "invoice" ? new Date(issueDate.getTime() + 14 * 86400_000) : null,
              currency: seed.currency,
              subtotal,
              tax: tax || null,
              total,
              category: seed.category,
              warnings: seed.warnings ?? [],
              reviewed: seed.reviewed ?? false,
              lineItems: {
                create: seed.items.map(([description, quantity, unitPrice], position) => ({
                  position,
                  description,
                  quantity,
                  unitPrice,
                  amount: round2(quantity * unitPrice),
                })),
              },
            }),
      },
    });
  }

  console.log(`Seeded ${SEEDS.length} documents for ${DEMO_EMAIL} (password: ${DEMO_PASSWORD})`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
