import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fashionApiGuard } from "@/lib/fashion/access";
import { audit } from "@/lib/documents";
import { buildVariantSku } from "@/lib/fashion/styles";
import { bomMaterialCost, type BomLineInput } from "@/lib/fashion/bom";
import { receivableRemaining } from "@/lib/fashion/finishedGoods";
import { applyFgMovement, ensureFinishedGood } from "@/lib/fashion/fgService";
import { z } from "zod";

const schema = z.object({
  color: z.string().max(80).nullable().optional(),
  lines: z.array(z.object({ size: z.string().max(40), quantity: z.number().int().min(0) })).min(1),
});

// Прехвърля готови бройки от поръчката в готовата продукция (Style+Color+Size).
// Ограничено до готовите (qtyReady) минус вече прехвърлените (qtyReceived) → без двойно.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await fashionApiGuard("manage_finished_goods");
  if (!g.ok) return g.res;
  try {
    const { id } = await params;
    const d = schema.parse(await req.json());
    const lines = d.lines.filter((l) => l.quantity > 0);
    if (!lines.length) return NextResponse.json({ error: "Няма бройки за прехвърляне." }, { status: 400 });
    const total = lines.reduce((s, l) => s + l.quantity, 0);

    const order = await prisma.fashionProductionOrder.findFirst({
      where: { id, companyId: g.companyId },
      select: { id: true, code: true, styleId: true, color: true, qtyReady: true, qtyReceived: true, style: { select: { skuPrefix: true, code: true } } },
    });
    if (!order) return NextResponse.json({ error: "Поръчката не е намерена." }, { status: 404 });
    const remaining = receivableRemaining(order.qtyReady, order.qtyReceived);
    if (total > remaining) return NextResponse.json({ error: `Максимум ${remaining} бройки могат да се прехвърлят.` }, { status: 400 });

    const color = d.color ?? order.color ?? "";
    const prefix = order.style.skuPrefix || order.style.code;

    // Материална себестойност/бр. от BOM (информативна себестойност на готовата продукция).
    const bom = await prisma.fashionBomItem.findMany({ where: { companyId: g.companyId, styleId: order.styleId }, include: { overrides: true, material: { select: { avgCost: true } } } });
    const bomLines: BomLineInput[] = bom.map((b) => ({ materialId: b.materialId, baseQuantity: b.quantity, unit: b.unit, unitCost: b.material.avgCost, overrides: b.overrides.map((o) => ({ size: o.size, color: o.color, quantity: o.quantity })) }));

    await prisma.$transaction(async (tx) => {
      for (const line of lines) {
        const sku = buildVariantSku(prefix, color, line.size);
        const fgId = await ensureFinishedGood(tx, g.companyId, order.styleId, color, line.size, sku);
        const unitCost = bomMaterialCost(bomLines, line.size, color || null);
        await applyFgMovement(tx, g.companyId, fgId, {
          type: "PRODUCTION_OUTPUT", quantity: line.quantity, unitCost, sourceType: "FashionProductionOrder", sourceId: order.id, userId: g.userId, note: `Поръчка ${order.code}`,
        }, true);
      }
      await tx.fashionProductionOrder.update({ where: { id }, data: { qtyReceived: { increment: total } } });
    });

    await audit(g.companyId, g.userId, "update", "FashionProductionOrder", id, `Прехвърлени в готова продукция: ${total} бр.`);
    return NextResponse.json({ success: true, received: total });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Невалидни данни." }, { status: 400 });
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}
