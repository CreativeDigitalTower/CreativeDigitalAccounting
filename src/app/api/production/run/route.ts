import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireFeature } from "@/lib/session";
import { audit } from "@/lib/documents";
import { z } from "zod";

const schema = z.object({
  recipeId: z.string(),
  multiplier: z.number().positive().default(1),
  batchNumber: z.string().optional().nullable(),
  // #14 — фирмата избира дали готовата продукция да се заприходи в склада
  addToWarehouse: z.boolean().default(true),
  // данни за заприходяване, когато рецептата няма зададен готов продукт
  output: z.object({
    name: z.string().min(1),
    warehouseId: z.string(),
    unit: z.string().min(1),
    quantity: z.number().positive(),
    unitCost: z.number().min(0).optional(),
    sku: z.string().optional().nullable(),
  }).optional(),
});

export async function POST(req: Request) {
  try {
    const { companyId, userId } = await requireFeature("production");
    const data = schema.parse(await req.json());

    const recipe = await prisma.recipe.findFirst({ where: { id: data.recipeId, companyId }, include: { ingredients: true } });
    if (!recipe) return NextResponse.json({ error: "Невалидна рецепта." }, { status: 400 });

    // Проверка на наличностите за всички съставки
    const ids = recipe.ingredients.map((i) => i.stockItemId);
    const items = await prisma.stockItem.findMany({ where: { companyId, id: { in: ids } } });
    const byId = new Map(items.map((i) => [i.id, i]));
    for (const ing of recipe.ingredients) {
      const it = byId.get(ing.stockItemId);
      const need = ing.quantity * data.multiplier;
      if (!it) return NextResponse.json({ error: "Липсваща съставка в склада." }, { status: 400 });
      if (it.quantity < need) return NextResponse.json({ error: `Недостатъчно „${it.name}" (нужни ${need}, налични ${it.quantity}).` }, { status: 400 });
    }

    const now = new Date();
    // Изписване на съставките
    for (const ing of recipe.ingredients) {
      const need = ing.quantity * data.multiplier;
      await prisma.stockMovement.create({ data: { stockItemId: ing.stockItemId, type: "production", quantity: -need, date: now, note: `Вложено в производство: ${recipe.name}` } });
      await prisma.stockItem.update({ where: { id: ing.stockItemId }, data: { quantity: { decrement: need } } });
    }

    // Заприходяване на готовата продукция (само ако фирмата го е избрала)
    let producedQty = 0;
    let outputItemId: string | null = null;
    if (data.addToWarehouse) {
      if (recipe.outputItemId) {
        // Готовият продукт е зададен в рецептата
        producedQty = recipe.outputQuantity * data.multiplier;
        const out = await prisma.stockItem.findFirst({ where: { id: recipe.outputItemId, companyId } });
        if (out) outputItemId = out.id;
      } else if (data.output) {
        // Създаване/намиране на артикул в избрания склад по подадените данни
        producedQty = data.output.quantity;
        const existing = await prisma.stockItem.findFirst({ where: { companyId, warehouseId: data.output.warehouseId, name: data.output.name } });
        if (existing) {
          outputItemId = existing.id;
        } else {
          const created = await prisma.stockItem.create({
            data: {
              companyId, warehouseId: data.output.warehouseId, name: data.output.name, unit: data.output.unit,
              quantity: 0, sku: data.output.sku ?? null, unitCost: data.output.unitCost ?? null,
            },
          });
          outputItemId = created.id;
        }
      } else {
        return NextResponse.json({ error: "Изберете склад и данни за заприходяване на готовата продукция." }, { status: 400 });
      }

      if (outputItemId && producedQty > 0) {
        await prisma.stockMovement.create({ data: { stockItemId: outputItemId, type: "production", quantity: producedQty, date: now, note: data.batchNumber ? `Произведено (партида ${data.batchNumber})` : "Произведено" } });
        await prisma.stockItem.update({ where: { id: outputItemId }, data: { quantity: { increment: producedQty } } });
        if (data.batchNumber) {
          await prisma.stockBatch.create({ data: { stockItemId: outputItemId, batchNumber: data.batchNumber, quantity: producedQty, note: `Производство: ${recipe.name}` } });
        }
      }
    }

    await audit(companyId, userId, "create", "Production", recipe.id, `Производство ${recipe.name} ×${data.multiplier}`);
    return NextResponse.json({ success: true, producedQty });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Невалидни данни." }, { status: 400 });
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}
