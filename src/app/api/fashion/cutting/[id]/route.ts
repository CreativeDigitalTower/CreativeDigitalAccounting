import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fashionApiGuard } from "@/lib/fashion/access";
import { audit } from "@/lib/documents";
import { fabricVariance, cuttingTotalUnits } from "@/lib/fashion/cutting";
import { z } from "zod";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await fashionApiGuard("view_fashion");
  if (!g.ok) return g.res;
  const { id } = await params;
  const b = await prisma.fashionCuttingBatch.findFirst({
    where: { id, companyId: g.companyId },
    include: {
      style: { select: { code: true, name: true, sizes: true, colors: true } },
      material: { select: { name: true, unit: true, quantity: true, avgCost: true } },
      lines: { orderBy: { size: "asc" } },
      remnants: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!b) return NextResponse.json({ error: "Не е намерен." }, { status: 404 });
  const totalUnits = cuttingTotalUnits(b.lines);
  return NextResponse.json({ ...b, totalUnits, variance: fabricVariance(b.expectedFabric, b.actualFabric) });
}

// Редакция само докато е чернова (draft). След потвърждаване данните са заключени.
const schema = z.object({
  color: z.string().max(80).nullable().optional(),
  roll: z.string().max(80).nullable().optional(),
  batch: z.string().max(80).nullable().optional(),
  actualFabric: z.number().min(0).optional(),
  waste: z.number().min(0).optional(),
  note: z.string().max(1000).nullable().optional(),
  lines: z.array(z.object({ size: z.string().max(40), quantity: z.number().int().min(0) })).optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await fashionApiGuard("manage_cutting");
  if (!g.ok) return g.res;
  try {
    const { id } = await params;
    const existing = await prisma.fashionCuttingBatch.findFirst({ where: { id, companyId: g.companyId }, select: { id: true, status: true } });
    if (!existing) return NextResponse.json({ error: "Не е намерен." }, { status: 404 });
    if (existing.status !== "draft") return NextResponse.json({ error: "Кроенето е потвърдено и не се редактира." }, { status: 409 });
    const d = schema.parse(await req.json());
    const { lines, ...rest } = d;
    await prisma.$transaction(async (tx) => {
      await tx.fashionCuttingBatch.update({ where: { id }, data: rest });
      if (lines) {
        await tx.fashionCuttingLine.deleteMany({ where: { batchId: id } });
        const keep = lines.filter((l) => l.quantity > 0);
        if (keep.length) await tx.fashionCuttingLine.createMany({ data: keep.map((l) => ({ batchId: id, size: l.size, quantity: l.quantity })) });
      }
    });
    await audit(g.companyId, g.userId, "update", "FashionCuttingBatch", id, "Редакция на кроене");
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Невалидни данни." }, { status: 400 });
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}
