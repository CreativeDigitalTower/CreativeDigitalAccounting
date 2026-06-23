import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireFeature } from "@/lib/session";
import { audit } from "@/lib/documents";
import { z } from "zod";

const schema = z.object({
  stockItemId: z.string(),
  quantity: z.number().positive(),
  unitPrice: z.number().min(0).optional().nullable(),
  supplierId: z.string().optional().nullable(),
  date: z.string(),
  note: z.string().optional().nullable(),
});

export async function POST(req: Request) {
  try {
    const { companyId, userId } = await requireFeature("warehouse");
    const data = schema.parse(await req.json());

    const item = await prisma.stockItem.findFirst({ where: { id: data.stockItemId, companyId } });
    if (!item) return NextResponse.json({ error: "Невалиден артикул." }, { status: 400 });

    await prisma.$transaction([
      prisma.stockMovement.create({
        data: {
          stockItemId: data.stockItemId, type: "receive", quantity: data.quantity,
          supplierId: data.supplierId ?? null, unitPrice: data.unitPrice ?? null,
          date: new Date(data.date), note: data.note ?? null,
        },
      }),
      prisma.stockItem.update({
        where: { id: data.stockItemId },
        data: {
          quantity: { increment: data.quantity },
          ...(data.unitPrice != null ? { unitCost: data.unitPrice } : {}),
        },
      }),
    ]);
    await audit(companyId, userId, "update", "StockItem", item.id, `Заприходяване +${data.quantity}`);
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Невалидни данни." }, { status: 400 });
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}
