import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireFeature } from "@/lib/session";
import { audit } from "@/lib/documents";
import { z } from "zod";

const schema = z.object({
  recipeId: z.string(),
  multiplier: z.number().positive().default(1),
  batchNumber: z.string().optional().nullable(),
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

    // Заприходяване на готовата продукция
    let producedQty = 0;
    if (recipe.outputItemId) {
      producedQty = recipe.outputQuantity * data.multiplier;
      const out = await prisma.stockItem.findFirst({ where: { id: recipe.outputItemId, companyId } });
      if (out) {
        await prisma.stockMovement.create({ data: { stockItemId: out.id, type: "production", quantity: producedQty, date: now, note: data.batchNumber ? `Произведено (партида ${data.batchNumber})` : "Произведено" } });
        await prisma.stockItem.update({ where: { id: out.id }, data: { quantity: { increment: producedQty } } });
        if (data.batchNumber) {
          await prisma.stockBatch.create({ data: { stockItemId: out.id, batchNumber: data.batchNumber, quantity: producedQty, note: `Производство: ${recipe.name}` } });
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
