import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/session";
import { audit } from "@/lib/documents";
import { z } from "zod";

const schema = z.object({ body: z.string().min(1).max(4000), kind: z.enum(["note", "technical", "estimate"]).optional() });

// Вътрешна бележка (не се вижда от клиента) (§10).
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  let userId: string; try { const { userId: u } = await requireSuperAdmin(); userId = u; } catch { return NextResponse.json({ error: "Няма достъп." }, { status: 403 }); }
  try {
    const { id } = await params;
    const r = await prisma.featureRequest.findUnique({ where: { id }, select: { id: true, companyId: true } });
    if (!r) return NextResponse.json({ error: "Не е намерена." }, { status: 404 });
    const d = schema.parse(await req.json());
    await prisma.$transaction(async (tx) => {
      await tx.featureRequestNote.create({ data: { requestId: id, authorId: userId, kind: d.kind ?? "note", body: d.body.trim() } });
      await tx.featureRequest.update({ where: { id }, data: { lastActivityAt: new Date() } });
    });
    await audit(r.companyId, userId, "update", "FeatureRequest", id, "Добавена бележка");
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Невалидни данни." }, { status: 400 });
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}
