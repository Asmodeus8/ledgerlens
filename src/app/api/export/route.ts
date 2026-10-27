import { getReportDocuments } from "@/lib/documents";
import { toCsv } from "@/lib/reports";

export async function GET() {
  const docs = await getReportDocuments();
  const date = new Date().toISOString().slice(0, 10);
  return new Response(toCsv(docs), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="ledgerlens-${date}.csv"`,
    },
  });
}
