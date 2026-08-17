import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fashionApiGuard } from "@/lib/fashion/access";
import { audit } from "@/lib/documents";
import { nextSequenceValue } from "@/lib/logistics/sequence";
import { FASHION_SEQ_SCOPE, FASHION_NUMBER_FORMATS, formatFashionNumber } from "@/lib/fashion/config";
import { resolveQuantity } from "@/lib/fashion/bom";
import { expectedFabric, cuttingTotalUnits } from "@/lib/fashion/cutting";
import { z } from "zod";

export async function GET() {
  const g = await fashionApiGuard("view_fashion");
  if (!g.ok) return g.res;
  const batches = await prisma.fashionCuttingBatch.findMany({
    where: { companyId: g.companyId },
    include: { style: { select: { code: true, name: true } }, material: { select: { name: true, unit: true } }, lines: { select: { quantity: true } } },
    orderBy: { createdAt: "desc" }, take: 1000,
  });
  return NextResponse.json(batches.map((b) => ({
    id: b.id, code: b.code, date: b.date, status: b.status, color: b.color,
    styleCode: b.style.code, styleName: b.style.name, materialName: b.material.name, unit: b.material.unit,
    totalUnits: b.lines.reduce((s, l) => s + l.quantity, 0),
    expectedFabric: b.expectedFabric, actualFabric: b.actualFabric, waste: b.waste,
  })));
}

const schema = z.object({
  styleId: z.string(),
  materialId: z.string(),
  color: z.string().max(80).nullable().optional(),
  roll: z.string().max(80).nullable().optional(),
  batch: z.string().max(80).nullable().optional(),
  date: z.string().optional(),
  actualFabric: z.number().min(0).optional(),
  waste: z.number().min(0).optional(),
  note: z.string().max(1000).nullable().optional(),
  lines: z.array(z.object({ size: z.string().max(40), quantity: z.number().int().min(0) })).min(1),
});

// Създава чернова на кроене + изчислява теоретичния разход плат от BOM. Приспадането
// на материал става при потвърждаване (виж /confirm), не тук.
export async function POST(req: Request) {
  const g = await fashionApiGuard("manage_cutting");
  if (!g.ok) return g.res;
  try {
    const d = schema.parse(await req.json());
    const [style, material, bomItem] = await Promise.all([
      prisma.fashionStyle.findFirst({ where: { id: d.styleId, companyId: g.companyId }, select: { id: true } }),
      prisma.fashionMaterial.findFirst({ where: { id: d.materialId, companyId: g.companyId }, select: { id: true } }),
      prisma.fashionBomItem.findFirst({ where: { companyId: g.companyId, styleId: d.styleId, materialId: d.materialId }, include: { overrides: true } }),
    ]);
    if (!style) return NextResponse.json({ error: "Моделът не е намерен." }, { status: 404 });
    if (!material) return NextResponse.json({ error: "Материалът не е намерен." }, { status: 404 });

    const lines = d.lines.filter((l) => l.quantity > 0);
    if (!lines.length) return NextResponse.json({ error: "Въведете поне един размер с количество." }, { status: 400 });

    // Теоретичен разход: за всеки размер BOM количеството плат × брой.
    const expected = bomItem
      ? expectedFabric(lines, (size) => resolveQuantity(bomItem.quantity, bomItem.overrides.map((o) => ({ size: o.size, color: o.color, quantity: o.quantity })), size, d.color ?? null))
      : 0;

    const year = (d.date ? new Date(d.date) : new Date()).getFullYear();
    const created = await prisma.$transaction(async (tx) => {
      const seq = await nextSequenceValue(tx, g.companyId, FASHION_SEQ_SCOPE.cutting, { year });
      const b = await tx.fashionCuttingBatch.create({
        data: {
          companyId: g.companyId, code: formatFashionNumber(FASHION_NUMBER_FORMATS.cutting, year, seq), seqYear: year, seqValue: seq,
          styleId: d.styleId, materialId: d.materialId, color: d.color ?? null, roll: d.roll ?? null, batch: d.batch ?? null,
          date: d.date ? new Date(d.date) : new Date(), status: "draft",
          expectedFabric: expected, actualFabric: d.actualFabric ?? 0, waste: d.waste ?? 0, note: d.note ?? null, createdById: g.userId,
        },
        select: { id: true, code: true },
      });
      await tx.fashionCuttingLine.createMany({ data: lines.map((l) => ({ batchId: b.id, size: l.size, quantity: l.quantity })) });
      return b;
    });

    await audit(g.companyId, g.userId, "create", "FashionCuttingBatch", created.id, `Кроене ${created.code} · ${cuttingTotalUnits(lines)} бр.`);
    return NextResponse.json({ id: created.id, code: created.code, expectedFabric: expected });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Невалидни данни." }, { status: 400 });
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}
