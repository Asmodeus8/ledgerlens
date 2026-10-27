# Ledgerlens

Upload invoices and receipts; Claude reads them and turns them into structured expense data you can review, correct, chart and export.

## Features

- **AI extraction**: PDFs and photos (JPEG, PNG, WebP) go to Claude with a Zod schema as a structured output. It returns the vendor, document number, dates, currency, subtotal, tax, total, category, line items and warnings about anything unreadable or inconsistent.
- **Background processing**: uploads return straight away, extraction runs after the response (`after()`), and the UI polls until it finishes.
- **Human in the loop**: every extracted field can be corrected next to the original document, and corrected documents are marked *Reviewed*.
- **Dashboard**: spend per currency (currencies are never added together), by category and by month.
- **CSV export**: neutralises spreadsheet formula injection.
- **Hardened file serving**: uploads are served with `nosniff` and a sandboxing CSP.

## Stack

| | |
|---|---|
| Framework | Next.js 16 (App Router, Server Actions, Cache Components), React 19, TypeScript |
| Data | PostgreSQL 17, Prisma 7 (driver adapter `@prisma/adapter-pg`) |
| AI | Claude via `@anthropic-ai/sdk`, structured outputs with Zod |
| UI | Tailwind CSS 4, light and dark themes |
| Tests | Vitest |

## Running locally

Requires Node 22+ and Docker.

```bash
cp .env.example .env          # then set ANTHROPIC_API_KEY
docker compose up -d          # Postgres on localhost:5433
npm install                   # also generates the Prisma client
npx prisma migrate dev        # create the tables
npm run dev
```

Open http://localhost:3000 and upload a receipt.

```bash
npm test                      # unit tests
npm run lint
npm run build
```

## Project layout

```
src/
  app/
    actions.ts                Server Actions: upload, correct, retry, delete
    page.tsx                  dashboard
    documents/                list and detail pages
    upload/                   drag-and-drop upload
    api/export/               CSV export
    api/documents/[id]/file/  serves the original upload
  lib/
    extraction.ts             Claude call and extraction schema
    documents.ts              queries and the extraction pipeline
    reports.ts                totals and CSV (pure, unit tested)
prisma/schema.prisma
```
