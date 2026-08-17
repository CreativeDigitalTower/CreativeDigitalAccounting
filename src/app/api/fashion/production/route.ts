import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fashionApiGuard } from "@/lib/fashion/access";
import { audit } from "@/lib/documents";
import { nextSequenceValue } from "@/lib/logistics/sequence";
import { FASHION_SEQ_SCOPE, FASHION_NUMBER_FORMATS, formatFashionNumber } from "@/lib/fashion/config";
import { productionCut } from "@/lib/fashion/production";
import { z } from "zod";

export async function GET() {
  const g = await fashionApiGuard("view_fashion");
  if (!g.ok) return g.res;
  const orders = await prisma.fashionProductionOrder.findMany({
    where: { companyId: g.companyId },
    include: { style: { select: { code: true, name: true } }, lines: { select: { cutQuantity: true } } },
    orderBy: { createdAt: "desc" }, take: 1000,
  });
  return NextResponse.json(orders.map((o) => ({
    id: o.id, code: o.code, date: o.date, status: o.status, color: o.color,
    styleCode: o.style.code, styleName: o.style.name, productionBatch: o.productionBatch,
    cut: o.lines.reduce((s, l) => s + l.cutQuantity, 0),
    qtyGood: o.qtyGood, qtyDefective: o.qtyDefective, qtyRepair: o.qtyRepair, qtyReady: o.qtyReady,
  })));
}

const schema = z.object({
  styleId: z.string().optional(),
  cuttingBatchId: z.string().optional(),
  color: z.string().max(80).nullable().optional(),
  productionBatch: z.string().max(80).nullable().optional(),
  date: z.string().optional(),
  note: z.string().max(1000).nullable().optional(),
  lines: z.array(z.object({ size: z.string().max(40), cutQuantity: z.number().int().min(0) })).optional(),
});

// Създава поръчка — от потвърдено кроене (пренася размерите/цвета) или ръчно.
export async function POST(req: Request) {
  const g = await fashionApiGuard("manage_production");
  if (!g.ok) return g.res;
  try {
    const d = schema.parse(await req.json());

    let styleId = d.styleId ?? null;
    let color = d.color ?? null;
    let lines = d.lines ?? [];
    if (d.cuttingBatchId) {
      const batch = await prisma.fashionCuttingBatch.findFirst({
        where: { id: d.cuttingBatchId, companyId: g.companyId },
        include: { lines: true },
      });
      if (!batch) return NextResponse.json({ error: "Кроенето не е намерено." }, { status: 404 });
      if (batch.status !== "confirmed") return NextResponse.json({ error: "Кроенето трябва да е потвърдено." }, { status: 400 });
      styleId = batch.styleId; color = color ?? batch.color;
      if (!lines.length) lines = batch.lines.map((l) => ({ size: l.size, cutQuantity: l.quantity }));
    }
    if (!styleId) return NextResponse.json({ error: "Изберете модел или кроене." }, { status: 400 });
    const style = await prisma.fashionStyle.findFirst({ where: { id: styleId, companyId: g.companyId }, select: { id: true } });
    if (!style) return NextResponse.json({ error: "Моделът не е намерен." }, { status: 404 });
    lines = lines.filter((l) => l.cutQuantity > 0);
    if (!lines.length) return NextResponse.json({ error: "Няма скроени бройки." }, { status: 400 });

    const year = (d.date ? new Date(d.date) : new Date()).getFullYear();
    const created = await prisma.$transaction(async (tx) => {
      const seq = await nextSequenceValue(tx, g.companyId, FASHION_SEQ_SCOPE.production, { year });
      const o = await tx.fashionProductionOrder.create({
        data: {
          companyId: g.companyId, code: formatFashionNumber(FASHION_NUMBER_FORMATS.production, year, seq), seqYear: year, seqValue: seq,
          styleId: styleId!, color, cuttingBatchId: d.cuttingBatchId ?? null, productionBatch: d.productionBatch ?? null,
          date: d.date ? new Date(d.date) : new Date(), status: "cut", note: d.note ?? null, createdById: g.userId,
        },
        select: { id: true, code: true },
      });
      await tx.fashionProductionOrderLine.createMany({ data: lines.map((l) => ({ orderId: o.id, size: l.size, cutQuantity: l.cutQuantity })) });
      return o;
    });
    await audit(g.companyId, g.userId, "create", "FashionProductionOrder", created.id, `Поръчка ${created.code} · ${productionCut(lines)} бр.`);
    return NextResponse.json({ id: created.id, code: created.code });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Невалидни данни." }, { status: 400 });
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}
