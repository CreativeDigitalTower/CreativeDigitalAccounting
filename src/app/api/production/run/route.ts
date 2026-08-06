import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireFeature } from "@/lib/session";
import { audit } from "@/lib/documents";
import { productionNumber, materialsCost as calcMaterialsCost, unitCost as calcUnitCost } from "@/lib/production";
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
    // Изписване на съставките + събиране на вложените суровини (за проследимост/себестойност)
    const consumed: { stockItemId: string; itemName: string; quantity: number; unit: string; unitCost: number | null }[] = [];
    for (const ing of recipe.ingredients) {
      const need = ing.quantity * data.multiplier;
      const it = byId.get(ing.stockItemId);
      await prisma.stockMovement.create({ data: { stockItemId: ing.stockItemId, type: "production", quantity: -need, date: now, note: `Вложено в производство: ${recipe.name}` } });
      await prisma.stockItem.update({ where: { id: ing.stockItemId }, data: { quantity: { decrement: need } } });
      consumed.push({ stockItemId: ing.stockItemId, itemName: it?.name ?? "—", quantity: need, unit: it?.unit ?? "бр", unitCost: it?.unitCost ?? null });
    }

    // Заприходяване на готовата продукция (само ако фирмата го е избрала)
    let producedQty = 0;
    let outputItemId: string | null = null;
    let outputName = recipe.name;
    let outputUnit = "бр";
    if (data.addToWarehouse) {
      if (recipe.outputItemId) {
        // Готовият продукт е зададен в рецептата
        producedQty = recipe.outputQuantity * data.multiplier;
        const out = await prisma.stockItem.findFirst({ where: { id: recipe.outputItemId, companyId } });
        if (out) { outputItemId = out.id; outputName = out.name; outputUnit = out.unit; }
      } else if (data.output) {
        // Създаване/намиране на артикул в избрания склад по подадените данни
        producedQty = data.output.quantity;
        outputName = data.output.name; outputUnit = data.output.unit;
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

    // ─── Траен запис на производствената поръчка + вложени суровини (проследимост) ───
    // Допълнение към съществуващата логика — не променя ефекта върху склада.
    let orderNumber: string | null = null;
    try {
      const year = now.getFullYear();
      const seq = await prisma.productionOrder.count({ where: { companyId, producedAt: { gte: new Date(year, 0, 1), lt: new Date(year + 1, 0, 1) } } });
      orderNumber = productionNumber(seq + 1, year);
      const mCost = calcMaterialsCost(consumed);
      const operator = await prisma.user.findUnique({ where: { id: userId }, select: { name: true, email: true } });
      await prisma.productionOrder.create({
        data: {
          companyId, number: orderNumber, recipeId: recipe.id, recipeName: recipe.name,
          outputItemId, outputName, outputBatch: data.batchNumber ?? null,
          quantity: producedQty, unit: outputUnit,
          materialsCost: mCost, unitCost: calcUnitCost(mCost, producedQty),
          status: "completed", operatorId: userId, operatorName: operator?.name ?? operator?.email ?? null,
          producedAt: now,
          consumptions: {
            create: consumed.map((c) => ({ stockItemId: c.stockItemId, itemName: c.itemName, quantity: c.quantity, unit: c.unit, unitCost: c.unitCost })),
          },
        },
      });
    } catch (e) { console.error("production order persist", e); }

    await audit(companyId, userId, "create", "Production", recipe.id, `Производство ${recipe.name} ×${data.multiplier}${orderNumber ? ` (${orderNumber})` : ""}`);
    return NextResponse.json({ success: true, producedQty, orderNumber });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Невалидни данни." }, { status: 400 });
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}
