import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireFeature } from "@/lib/session";
import { audit } from "@/lib/documents";
import { z } from "zod";

const schema = z.object({
  warehouseId: z.string(),
  categoryId: z.string().optional().nullable(),
  name: z.string().min(1),
  sku: z.string().optional().nullable(),
  quantity: z.number().min(0).default(0),
  minQuantity: z.number().min(0).optional().nullable(),
  unit: z.string().default("бр"),
  unitCost: z.number().min(0).optional().nullable(),
  expiryDate: z.string().optional().nullable(),
});

export async function POST(req: Request) {
  try {
    const { companyId, userId } = await requireFeature("warehouse");
    const data = schema.parse(await req.json());

    const wh = await prisma.warehouse.findFirst({ where: { id: data.warehouseId, companyId } });
    if (!wh) return NextResponse.json({ error: "Невалиден склад." }, { status: 400 });

    const item = await prisma.stockItem.create({
      data: {
        companyId, warehouseId: data.warehouseId, categoryId: data.categoryId ?? null, name: data.name,
        sku: data.sku ?? null, quantity: data.quantity,
        minQuantity: data.minQuantity ?? null, unit: data.unit, unitCost: data.unitCost ?? null,
        expiryDate: data.expiryDate ? new Date(data.expiryDate) : null,
      },
    });
    await audit(companyId, userId, "create", "StockItem", item.id, data.name);
    return NextResponse.json(item);
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Невалидни данни." }, { status: 400 });
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}
