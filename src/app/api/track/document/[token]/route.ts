import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { recordDocumentEvent, clientIp, hashIp, coarseDevice, type DocEventType } from "@/lib/documentTracking";

// Публичен beacon за проследяване на преглед/сваляне/печат от портала (/d/[token]).
// Записва GDPR-съвместимо събитие (хеширан IP + груб UA). „viewed" — веднъж.
const ALLOWED: Record<string, DocEventType> = {
  viewed: "viewed",
  downloaded: "downloaded",
  printed: "printed",
  link_visited: "link_visited",
};

export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    const body = await req.json().catch(() => ({}));
    const type = ALLOWED[String(body?.action)];
    if (!type) return NextResponse.json({ ok: false }, { status: 400 });

    const doc = await prisma.document.findUnique({ where: { publicToken: token }, select: { id: true, companyId: true } });
    if (!doc) return NextResponse.json({ ok: false }, { status: 404 });

    await recordDocumentEvent(doc.id, type, {
      companyId: doc.companyId,
      channel: "portal",
      ipHash: hashIp(clientIp(req.headers)),
      device: coarseDevice(req.headers.get("user-agent")),
      once: type === "viewed", // прегледът се брои веднъж на документ
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}
