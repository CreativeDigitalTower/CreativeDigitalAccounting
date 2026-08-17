import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fashionApiGuard } from "@/lib/fashion/access";
import { recomputeOrderCounts } from "@/lib/fashion/qcService";
import { audit } from "@/lib/documents";
import { DEFECT_DISPOSITIONS } from "@/lib/fashion/qc";
import { z } from "zod";

const schema = z.object({
  productionOrderId: z.string(),
  quantity: z.number().int().positive(),
  defectType: z.string().min(1).max(120),
  size: z.string().max(40).nullable().optional(),
  color: z.string().max(80).nullable().optional(),
  description: z.string().max(1000).nullable().optional(),
  photoUrl: z.string().nullable().optional(),
  disposition: z.enum(DEFECT_DISPOSITIONS).optional(),
});

export async function POST(req: Request) {
  const g = await fashionApiGuard("manage_qc");
  if (!g.ok) return g.res;
  try {
    const d = schema.parse(await req.json());
    const order = await prisma.fashionProductionOrder.findFirst({ where: { id: d.productionOrderId, companyId: g.companyId }, select: { id: true, code: true } });
    if (!order) return NextResponse.json({ error: "Поръчката не е намерена." }, { status: 404 });
    await prisma.$transaction(async (tx) => {
      await tx.fashionDefect.create({
        data: {
          companyId: g.companyId, productionOrderId: d.productionOrderId, quantity: d.quantity, defectType: d.defectType.trim(),
          size: d.size ?? null, color: d.color ?? null, description: d.description ?? null, photoUrl: d.photoUrl ?? null,
          disposition: d.disposition ?? "repair", createdById: g.userId,
        },
      });
      await recomputeOrderCounts(tx, g.companyId, d.productionOrderId);
    });
    await audit(g.companyId, g.userId, "create", "FashionDefect", order.id, `Дефект ${order.code}: ${d.quantity} × ${d.defectType}`);
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Невалидни данни." }, { status: 400 });
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}
