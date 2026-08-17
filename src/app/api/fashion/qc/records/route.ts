import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fashionApiGuard } from "@/lib/fashion/access";
import { recomputeOrderCounts } from "@/lib/fashion/qcService";
import { audit } from "@/lib/documents";
import { z } from "zod";

// Добавя QC минаване (годни бройки) към поръчка и преизчислява броевете (idempotent).
const schema = z.object({ productionOrderId: z.string(), goodQty: z.number().int().min(0), note: z.string().max(500).nullable().optional() });

export async function POST(req: Request) {
  const g = await fashionApiGuard("manage_qc");
  if (!g.ok) return g.res;
  try {
    const d = schema.parse(await req.json());
    const order = await prisma.fashionProductionOrder.findFirst({ where: { id: d.productionOrderId, companyId: g.companyId }, select: { id: true, code: true } });
    if (!order) return NextResponse.json({ error: "Поръчката не е намерена." }, { status: 404 });
    await prisma.$transaction(async (tx) => {
      await tx.fashionQcRecord.create({ data: { companyId: g.companyId, productionOrderId: d.productionOrderId, goodQty: d.goodQty, note: d.note ?? null, createdById: g.userId } });
      await recomputeOrderCounts(tx, g.companyId, d.productionOrderId);
    });
    await audit(g.companyId, g.userId, "create", "FashionQcRecord", order.id, `QC ${order.code}: +${d.goodQty} годни`);
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Невалидни данни." }, { status: 400 });
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}
