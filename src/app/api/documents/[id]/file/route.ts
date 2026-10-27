import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";

export async function GET(_req: Request, ctx: RouteContext<"/api/documents/[id]/file">) {
  const session = await getSession();
  if (!session) return new Response("Unauthorized", { status: 401 });

  const { id } = await ctx.params;
  const doc = await prisma.document.findFirst({
    where: { id, userId: session.user.id },
    select: { fileData: true, mimeType: true, fileName: true },
  });
  if (!doc) return new Response("Not found", { status: 404 });

  return new Response(new Uint8Array(doc.fileData), {
    headers: {
      "Content-Type": doc.mimeType,
      "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(doc.fileName)}`,
      "Cache-Control": "private, max-age=3600",
      // Uploads are untrusted: never let the browser sniff them into something executable.
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox",
    },
  });
}
