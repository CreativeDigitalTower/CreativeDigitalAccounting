// Помощни функции за модул „Производство" — производствен номер и себестойност.
// Чисти функции (покрити с тестове), без странични ефекти.

export type ProductionStatus = "planned" | "in_progress" | "completed" | "cancelled";
export const PRODUCTION_STATUSES: ProductionStatus[] = ["planned", "in_progress", "completed", "cancelled"];

/** Производствен номер по фирма и година: PR-YYYY-NNNN (последователен). */
export function productionNumber(seqInYear: number, year: number = new Date().getFullYear()): string {
  return `PR-${year}-${String(seqInYear).padStart(4, "0")}`;
}

export type ConsumedMaterial = { quantity: number; unitCost?: number | null };

/** Сумарна себестойност на вложените суровини (закръглено до 2 знака). */
export function materialsCost(consumed: ConsumedMaterial[]): number {
  const total = consumed.reduce((s, c) => s + c.quantity * (c.unitCost ?? 0), 0);
  return +total.toFixed(2);
}

/** Себестойност за единица готова продукция. */
export function unitCost(totalMaterials: number, producedQty: number): number {
  if (producedQty <= 0) return 0;
  return +(totalMaterials / producedQty).toFixed(4);
}
