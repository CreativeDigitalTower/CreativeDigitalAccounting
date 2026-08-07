// Производствени справки — чисти функции за обобщение и групиране на
// производствените поръчки (по продукт/оператор/партида) и вложените суровини.
// Тествани; ползват се от страницата с производствени справки.

export type ConsumedForReport = { itemName: string; quantity: number; unit?: string | null; unitCost?: number | null };
export type OrderForReport = {
  outputName: string;
  outputBatch?: string | null;
  quantity: number;
  unit?: string | null;
  materialsCost?: number | null;
  unitCost?: number | null;
  operatorName?: string | null;
  status: string;
  consumptions: ConsumedForReport[];
};

const UNSET = "—";
const r2 = (n: number) => +n.toFixed(2);

/** Само реалните производства (изключва анулираните). */
export function activeOrders(orders: OrderForReport[]): OrderForReport[] {
  return orders.filter((o) => o.status !== "cancelled");
}

export type ProductionSummary = {
  count: number;          // брой производства
  producedQty: number;    // общо произведено количество
  producedValue: number;  // произведена стойност (себестойност × количество)
  materialsCost: number;  // общ разход на суровини
  avgUnitCost: number;    // средна себестойност за единица
};

export function summarizeProduction(orders: OrderForReport[]): ProductionSummary {
  const active = activeOrders(orders);
  let producedQty = 0, producedValue = 0, materialsCost = 0;
  for (const o of active) {
    producedQty += o.quantity;
    producedValue += (o.unitCost ?? 0) * o.quantity;
    materialsCost += o.materialsCost ?? 0;
  }
  return {
    count: active.length,
    producedQty: r2(producedQty),
    producedValue: r2(producedValue),
    materialsCost: r2(materialsCost),
    avgUnitCost: producedQty > 0 ? r2(materialsCost / producedQty) : 0,
  };
}

export type OrderGroupRow = { name: string; count: number; qty: number; value: number; materials: number };

/** Групира поръчките по продукт/оператор/партида; сортира по стойност низходящо. */
export function groupOrders(orders: OrderForReport[], by: "product" | "operator" | "batch"): OrderGroupRow[] {
  const map = new Map<string, OrderGroupRow>();
  for (const o of activeOrders(orders)) {
    const name = (by === "product" ? o.outputName : by === "operator" ? o.operatorName : o.outputBatch)?.trim() || UNSET;
    const row = map.get(name) ?? { name, count: 0, qty: 0, value: 0, materials: 0 };
    row.count += 1; row.qty += o.quantity;
    row.value += (o.unitCost ?? 0) * o.quantity; row.materials += o.materialsCost ?? 0;
    map.set(name, row);
  }
  return [...map.values()]
    .map((r) => ({ ...r, qty: r2(r.qty), value: r2(r.value), materials: r2(r.materials) }))
    .sort((a, b) => b.value - a.value);
}

export type MaterialRow = { name: string; qty: number; cost: number };

/** Обобщава вложените суровини по всички поръчки (разход на суровини). */
export function groupConsumedMaterials(orders: OrderForReport[]): MaterialRow[] {
  const map = new Map<string, MaterialRow>();
  for (const o of activeOrders(orders)) {
    for (const c of o.consumptions) {
      const name = c.itemName?.trim() || UNSET;
      const row = map.get(name) ?? { name, qty: 0, cost: 0 };
      row.qty += c.quantity; row.cost += c.quantity * (c.unitCost ?? 0);
      map.set(name, row);
    }
  }
  return [...map.values()]
    .map((r) => ({ ...r, qty: r2(r.qty), cost: r2(r.cost) }))
    .sort((a, b) => b.cost - a.cost);
}
