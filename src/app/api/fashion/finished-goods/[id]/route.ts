import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fashionApiGuard, getFashionSettings } from "@/lib/fashion/access";
import { applyFgMovement, FgInsufficientError } from "@/lib/fashion/fgService";
import { audit } from "@/lib/documents";
import { z } from "zod";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await fashionApiGuard("view_fashion");
  if (!g.ok) return g.res;
  const { id } = await params;
  const fg = await prisma.fashionFinishedGood.findFirst({
    where: { id, companyId: g.companyId },
    include: { style: { select: { code: true, name: true } }, movements: { orderBy: { createdAt: "desc" }, take: 200 } },
  });
  if (!fg) return NextResponse.json({ error: "Не е намерена." }, { status: 404 });
  return NextResponse.json(fg);
}

// Ръчна корекция/движение: GIFT/MARKETING/SCRAP/RESERVE/UNRESERVE/RETURN/ADJUSTMENT.
const schema = z.object({
  type: z.enum(["GIFT", "MARKETING", "SCRAP", "RESERVE", "UNRESERVE", "RETURN", "ADJUSTMENT"]),
  direction: z.enum(["in", "out"]).optional(), // само за ADJUSTMENT
  quantity: z.number().int().positive(),
  note: z.string().max(500).nullable().optional(),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await fashionApiGuard("manage_finished_goods");
  if (!g.ok) return g.res;
  try {
    const { id } = await params;
    const fg = await prisma.fashionFinishedGood.findFirst({ where: { id, companyId: g.companyId }, select: { id: true } });
    if (!fg) return NextResponse.json({ error: "Не е намерена." }, { status: 404 });
    const d = schema.parse(await req.json());
    const settings = await getFashionSettings(g.companyId);
    await prisma.$transaction((tx) => applyFgMovement(tx, g.companyId, id, { type: d.type, direction: d.direction, quantity: d.quantity, note: d.note ?? null, userId: g.userId }, settings.allowNegativeStock));
    await audit(g.companyId, g.userId, "update", "FashionFinishedGood", id, `${d.type}: ${d.quantity}`);
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof FgInsufficientError) return NextResponse.json({ error: "Недостатъчна наличност.", insufficient: true }, { status: 409 });
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Невалидни данни." }, { status: 400 });
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}
