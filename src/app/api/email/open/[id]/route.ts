import { prisma } from "@/lib/prisma";
import { recordDocumentEvent } from "@/lib/documentTracking";

const PIXEL = Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64");

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const log = await prisma.emailLog.update({
      where: { id },
      data: { opensCount: { increment: 1 }, openedAt: new Date() },
      select: { documentId: true, companyId: true },
    });
    // Document Tracking: ако имейлът е за документ — записваме „отворен имейл".
    if (log.documentId) {
      await recordDocumentEvent(log.documentId, "email_opened", { companyId: log.companyId ?? undefined, channel: "email", once: true });
    }
  } catch {}
  return new Response(PIXEL, {
    headers: { "Content-Type": "image/gif", "Cache-Control": "no-store, no-cache, must-revalidate, private" },
  });
}
