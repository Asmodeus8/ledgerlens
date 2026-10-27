import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod/v4";
import { CATEGORIES } from "@/lib/categories";
import { demoExtraction } from "@/lib/demo-extraction";

export const SUPPORTED_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

export type SupportedMimeType = (typeof SUPPORTED_MIME_TYPES)[number];

export function isSupportedMimeType(type: string): type is SupportedMimeType {
  return (SUPPORTED_MIME_TYPES as readonly string[]).includes(type);
}

export const ExtractionSchema = z.object({
  documentType: z.enum(["invoice", "receipt", "bill", "other"]),
  vendorName: z.string().nullable(),
  documentNumber: z.string().nullable(),
  issueDate: z.string().nullable().describe("ISO date, YYYY-MM-DD"),
  dueDate: z.string().nullable().describe("ISO date, YYYY-MM-DD"),
  currency: z.string().nullable().describe("ISO 4217 code, e.g. NGN, USD"),
  subtotal: z.number().nullable(),
  tax: z.number().nullable(),
  total: z.number().nullable(),
  category: z.enum(CATEGORIES),
  lineItems: z.array(
    z.object({
      description: z.string(),
      quantity: z.number().nullable(),
      unitPrice: z.number().nullable(),
      amount: z.number().nullable(),
    }),
  ),
  warnings: z
    .array(z.string())
    .describe("Anything unreadable, ambiguous or inconsistent in the document"),
});

export type Extraction = z.infer<typeof ExtractionSchema>;

const SYSTEM_PROMPT = `You extract structured data from invoices, receipts and bills for a small-business bookkeeping app.

Read the attached document and fill in every field you can find. Use null for anything that is not on the document; never guess a value that isn't printed. Dates are YYYY-MM-DD. Amounts are plain numbers in the document's currency with no symbols or thousands separators. Infer the currency from symbols or context (₦ is NGN). Pick the expense category that best fits the vendor and items.

If the totals don't add up, a value is hard to read, or the document doesn't look like a financial document, say so in warnings.`;

export class ExtractionError extends Error {}

const client = new Anthropic();

/** Claude when an API key is set, otherwise demo data. EXTRACTION_MODE forces either. */
export function extractionMode(): "claude" | "demo" {
  const configured = process.env.EXTRACTION_MODE;
  if (configured === "claude" || configured === "demo") return configured;
  return process.env.ANTHROPIC_API_KEY ? "claude" : "demo";
}

export async function extractDocument(
  data: Buffer,
  mimeType: SupportedMimeType,
): Promise<Extraction> {
  if (extractionMode() === "demo") return demoExtraction(data);

  const base64 = data.toString("base64");
  const attachment: Anthropic.Beta.BetaContentBlockParam =
    mimeType === "application/pdf"
      ? {
          type: "document",
          source: { type: "base64", media_type: "application/pdf", data: base64 },
        }
      : {
          type: "image",
          source: { type: "base64", media_type: mimeType, data: base64 },
        };

  if (!process.env.ANTHROPIC_API_KEY) {
    throw new ExtractionError("No Anthropic API key is configured.");
  }

  const response = await client.beta.messages.parse({
    model: "claude-opus-5-5",
    max_tokens: 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: {
      effort: "low",
      format: betaZodOutputFormat(ExtractionSchema),
    },
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: [attachment, { type: "text", text: "Extract this document." }],
      },
    ],
  }).catch((err: unknown) => {
    throw toExtractionError(err);
  });

  if (response.stop_reason === "refusal") {
    throw new ExtractionError("The model declined to process this document.");
  }
  if (response.stop_reason === "max_tokens") {
    throw new ExtractionError("The document was too long to extract in one pass.");
  }
  if (!response.parsed_output) {
    throw new ExtractionError("The model returned data that didn't match the schema.");
  }
  return response.parsed_output;
}

function toExtractionError(err: unknown): unknown {
  if (err instanceof Anthropic.AuthenticationError) {
    return new ExtractionError("The Anthropic API key was rejected.");
  }
  if (err instanceof Anthropic.PermissionDeniedError) {
    return new ExtractionError("The Anthropic API key can't use this model.");
  }
  if (err instanceof Anthropic.RateLimitError) {
    return new ExtractionError("Rate limited by the extraction service. Try again shortly.");
  }
  if (err instanceof Anthropic.APIConnectionError) {
    return new ExtractionError("Couldn't reach the extraction service. Try again.");
  }
  if (err instanceof Anthropic.BadRequestError) {
    return new ExtractionError("This file couldn't be read. Try a clearer scan or a different format.");
  }
  return err;
}
