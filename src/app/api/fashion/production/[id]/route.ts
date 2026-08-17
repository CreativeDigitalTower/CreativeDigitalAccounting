import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fashionApiGuard } from "@/lib/fashion/access";
import { audit } from "@/lib/documents";
import { canTransition, nextStatuses, productionCut, PRODUCTION_STATUSES } from "@/lib/fashion/production";
import { z } from "zod";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await fashionApiGuard("view_fashion");
  if (!g.ok) return g.res;
  const { id } = await params;
  const o = await prisma.fashionProductionOrder.findFirst({
    where: { id, companyId: g.companyId },
    include: { style: { select: { code: true, name: true } }, batch: { select: { code: true } }, lines: { orderBy: { size: "asc" } } },
  });
  if (!o) return NextResponse.json({ error: "Не е намерена." }, { status: 404 });
  return NextResponse.json({ ...o, cut: productionCut(o.lines), nextStatuses: nextStatuses(o.status) });
}

const schema = z.object({
  status: z.enum(PRODUCTION_STATUSES).optional(),
  productionBatch: z.string().max(80).nullable().optional(),
  note: z.string().max(1000).nullable().optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await fashionApiGuard("manage_production");
  if (!g.ok) return g.res;
  try {
    const { id } = await params;
    const existing = await prisma.fashionProductionOrder.findFirst({ where: { id, companyId: g.companyId }, select: { id: true, status: true, code: true } });
    if (!existing) return NextResponse.json({ error: "Не е намерена." }, { status: 404 });
    const d = schema.parse(await req.json());
    if (d.status && d.status !== existing.status && !canTransition(existing.status, d.status)) {
      return NextResponse.json({ error: "Недопустима промяна на статуса." }, { status: 409 });
    }
    const o = await prisma.fashionProductionOrder.update({ where: { id }, data: d });
    if (d.status) await audit(g.companyId, g.userId, "status_change", "FashionProductionOrder", id, `Поръчка ${existing.code}: ${existing.status} → ${d.status}`);
    else await audit(g.companyId, g.userId, "update", "FashionProductionOrder", id, `Поръчка ${existing.code}`);
    return NextResponse.json(o);
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Невалидни данни." }, { status: 400 });
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}
