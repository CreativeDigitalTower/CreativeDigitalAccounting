import { requireFeature } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { ProductionPanel } from "@/components/app/ProductionPanel";
import { CostCalculator } from "@/components/app/CostCalculator";
import { ProductionHistory, type ProdOrder } from "@/components/app/ProductionHistory";

export default async function ProductionPage() {
  const { companyId } = await requireFeature("production");
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const [recipeRows, itemRows, warehouseRows, orderRows] = await Promise.all([
    prisma.recipe.findMany({ where: { companyId }, include: { ingredients: true }, orderBy: { name: "asc" } }),
    prisma.stockItem.findMany({ where: { companyId }, orderBy: { name: "asc" } }),
    prisma.warehouse.findMany({ where: { companyId }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.productionOrder.findMany({ where: { companyId }, include: { consumptions: true }, orderBy: { producedAt: "desc" }, take: 200 }),
  ]);
  const recipes = recipeRows.map((r) => ({
    id: r.id, name: r.name, outputItemId: r.outputItemId, outputQuantity: r.outputQuantity, note: r.note,
    ingredients: r.ingredients.map((i) => ({ id: i.id, stockItemId: i.stockItemId, quantity: i.quantity })),
  }));
  const items = itemRows.map((i) => ({ id: i.id, name: i.name, unit: i.unit, quantity: i.quantity }));

  const orders: ProdOrder[] = orderRows.map((o) => ({
    id: o.id, number: o.number, producedAt: o.producedAt.toISOString(), outputName: o.outputName, outputBatch: o.outputBatch,
    quantity: o.quantity, unit: o.unit, materialsCost: o.materialsCost, unitCost: o.unitCost,
    status: o.status, operatorName: o.operatorName, recipeName: o.recipeName,
    consumptions: o.consumptions.map((c) => ({ itemName: c.itemName, quantity: c.quantity, unit: c.unit, unitCost: c.unitCost })),
  }));
  // KPI за текущия месец (реални данни от производствените поръчки).
  const monthOrders = orderRows.filter((o) => o.producedAt >= monthStart && o.status !== "cancelled");
  const producedValue = monthOrders.reduce((s, o) => s + (o.unitCost ?? 0) * o.quantity, 0);
  const materialsCostSum = monthOrders.reduce((s, o) => s + (o.materialsCost ?? 0), 0);
  const producedQtySum = monthOrders.reduce((s, o) => s + o.quantity, 0);
  const kpi = {
    count: monthOrders.length,
    producedValue: +producedValue.toFixed(2),
    materialsCost: +materialsCostSum.toFixed(2),
    avgUnitCost: producedQtySum > 0 ? +(materialsCostSum / producedQtySum).toFixed(2) : 0,
  };

  return (
    <>
      <ProductionPanel initialRecipes={recipes} items={items} warehouses={warehouseRows} />
      <ProductionHistory orders={orders} kpi={kpi} />
      <CostCalculator />
    </>
  );
}
