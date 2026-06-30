import { requireFeature } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { ProductionPanel } from "@/components/app/ProductionPanel";
import { CostCalculator } from "@/components/app/CostCalculator";

export default async function ProductionPage() {
  const { companyId } = await requireFeature("production");
  const [recipeRows, itemRows, warehouseRows] = await Promise.all([
    prisma.recipe.findMany({ where: { companyId }, include: { ingredients: true }, orderBy: { name: "asc" } }),
    prisma.stockItem.findMany({ where: { companyId }, orderBy: { name: "asc" } }),
    prisma.warehouse.findMany({ where: { companyId }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  const recipes = recipeRows.map((r) => ({
    id: r.id, name: r.name, outputItemId: r.outputItemId, outputQuantity: r.outputQuantity, note: r.note,
    ingredients: r.ingredients.map((i) => ({ id: i.id, stockItemId: i.stockItemId, quantity: i.quantity })),
  }));
  const items = itemRows.map((i) => ({ id: i.id, name: i.name, unit: i.unit, quantity: i.quantity }));
  return (
    <>
      <ProductionPanel initialRecipes={recipes} items={items} warehouses={warehouseRows} />
      <CostCalculator />
    </>
  );
}
