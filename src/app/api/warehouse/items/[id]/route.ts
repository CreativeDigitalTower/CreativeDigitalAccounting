import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireFeature } from "@/lib/session";
import { audit } from "@/lib/documents";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(1).optional(),
  sku: z.string().optional().nullable(),
  categoryId: z.string().optional().nullable(),
  quantity: z.number().min(0).optional(),
  minQuantity: z.number().min(0).optional().nullable(),
  unit: z.string().optional(),
  unitCost: z.number().min(0).optional().nullable(),
  expiryDate: z.string().optional().nullable(),
});

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { companyId, userId } = await requireFeature("warehouse");
    const { id } = await params;
    const existing = await prisma.stockItem.findFirst({ where: { id, companyId }, select: { id: true } });
    if (!existing) return NextResponse.json({ error: "Не е намерен." }, { status: 404 });
    const d = schema.parse(await req.json());
    const item = await prisma.stockItem.update({
      where: { id },
      data: {
        ...(d.name !== undefined ? { name: d.name } : {}),
        ...(d.sku !== undefined ? { sku: d.sku } : {}),
        ...(d.categoryId !== undefined ? { categoryId: d.categoryId || null } : {}),
        ...(d.quantity !== undefined ? { quantity: d.quantity } : {}),
        ...(d.minQuantity !== undefined ? { minQuantity: d.minQuantity } : {}),
        ...(d.unit !== undefined ? { unit: d.unit } : {}),
        ...(d.unitCost !== undefined ? { unitCost: d.unitCost } : {}),
        ...(d.expiryDate !== undefined ? { expiryDate: d.expiryDate ? new Date(d.expiryDate) : null } : {}),
      },
    });
    await audit(companyId, userId, "update", "StockItem", id, item.name);
    return NextResponse.json(item);
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Невалидни данни." }, { status: 400 });
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { companyId, userId } = await requireFeature("warehouse");
    const { id } = await params;
    const item = await prisma.stockItem.findFirst({ where: { id, companyId }, select: { id: true, name: true } });
    if (!item) return NextResponse.json({ error: "Не е намерен." }, { status: 404 });
    try {
      await prisma.stockItem.delete({ where: { id } }); // движенията се трият каскадно
    } catch {
      return NextResponse.json({ error: "Артикулът се използва в рецепта или ревизия и не може да бъде изтрит." }, { status: 400 });
    }
    await audit(companyId, userId, "delete", "StockItem", id, item.name);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}
