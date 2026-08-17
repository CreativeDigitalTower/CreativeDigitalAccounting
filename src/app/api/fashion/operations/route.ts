import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fashionApiGuard } from "@/lib/fashion/access";
import { audit } from "@/lib/documents";
import { totalMinutes, minutesByCategory, minutesByMachine, minutesToHours, type OpLike } from "@/lib/fashion/operations";
import { z } from "zod";

// GET ?styleId=… → операциите на модел + обобщения за времето. Без styleId → обзор.
export async function GET(req: Request) {
  const g = await fashionApiGuard("view_fashion");
  if (!g.ok) return g.res;
  const styleId = new URL(req.url).searchParams.get("styleId") || undefined;

  if (!styleId) {
    const styles = await prisma.fashionStyle.findMany({
      where: { companyId: g.companyId },
      select: { id: true, code: true, name: true, status: true, operations: { select: { expectedMinutes: true } } },
      orderBy: { updatedAt: "desc" }, take: 2000,
    });
    return NextResponse.json(styles.map((s) => ({
      id: s.id, code: s.code, name: s.name, status: s.status, opCount: s.operations.length,
      totalMinutes: totalMinutes(s.operations),
    })));
  }

  const style = await prisma.fashionStyle.findFirst({ where: { id: styleId, companyId: g.companyId }, select: { id: true, code: true, name: true } });
  if (!style) return NextResponse.json({ error: "Моделът не е намерен." }, { status: 404 });
  const ops = await prisma.fashionOperation.findMany({
    where: { companyId: g.companyId, styleId },
    include: { category: { select: { name: true } }, machine: { select: { name: true } } },
    orderBy: [{ seq: "asc" }, { createdAt: "asc" }],
  });
  const rows = ops.map((o) => ({
    id: o.id, seq: o.seq, name: o.name, description: o.description, categoryId: o.categoryId,
    categoryLabel: o.category?.name ?? null, machineId: o.machineId,
    machineLabel: o.machine?.name ?? o.machineLabel ?? null, expectedMinutes: o.expectedMinutes,
    workstation: o.workstation, instructions: o.instructions,
  }));
  const opsForCalc: OpLike[] = rows.map((r) => ({ expectedMinutes: r.expectedMinutes, categoryLabel: r.categoryLabel, machineLabel: r.machineLabel }));
  const total = totalMinutes(opsForCalc);
  return NextResponse.json({
    style, operations: rows,
    totalMinutes: total, totalHours: minutesToHours(total),
    byCategory: minutesByCategory(opsForCalc), byMachine: minutesByMachine(opsForCalc),
  });
}

const schema = z.object({
  styleId: z.string(),
  name: z.string().min(1).max(160),
  categoryId: z.string().nullable().optional(),
  machineId: z.string().nullable().optional(),
  machineLabel: z.string().max(120).nullable().optional(),
  expectedMinutes: z.number().min(0).optional(),
  workstation: z.string().max(120).nullable().optional(),
  description: z.string().max(2000).nullable().optional(),
  instructions: z.string().max(4000).nullable().optional(),
});

export async function POST(req: Request) {
  const g = await fashionApiGuard("manage_production");
  if (!g.ok) return g.res;
  try {
    const d = schema.parse(await req.json());
    const style = await prisma.fashionStyle.findFirst({ where: { id: d.styleId, companyId: g.companyId }, select: { id: true } });
    if (!style) return NextResponse.json({ error: "Моделът не е намерен." }, { status: 404 });
    if (d.categoryId) { const c = await prisma.fashionOperationCategory.findFirst({ where: { id: d.categoryId, companyId: g.companyId }, select: { id: true } }); if (!c) return NextResponse.json({ error: "Категорията не е намерена." }, { status: 404 }); }
    if (d.machineId) { const m = await prisma.fashionMachine.findFirst({ where: { id: d.machineId, companyId: g.companyId }, select: { id: true } }); if (!m) return NextResponse.json({ error: "Машината не е намерена." }, { status: 404 }); }
    const max = await prisma.fashionOperation.aggregate({ where: { styleId: d.styleId }, _max: { seq: true } });
    const op = await prisma.fashionOperation.create({
      data: {
        companyId: g.companyId, styleId: d.styleId, seq: (max._max.seq ?? 0) + 1, name: d.name.trim(),
        categoryId: d.categoryId ?? null, machineId: d.machineId ?? null, machineLabel: d.machineLabel ?? null,
        expectedMinutes: d.expectedMinutes ?? 0, workstation: d.workstation ?? null,
        description: d.description ?? null, instructions: d.instructions ?? null, createdById: g.userId,
      },
    });
    await audit(g.companyId, g.userId, "create", "FashionOperation", op.id, `Операция: ${op.name}`);
    return NextResponse.json(op);
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Невалидни данни." }, { status: 400 });
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}
