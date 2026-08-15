/**
 * Inventory allocation (получено / продадено / остатък) — чисти функции, тествани.
 * Double-selling се пази на ниво транзакция; тук е математиката + проверката.
 */

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

export type InventoryBalance = { received: number; sold: number; remaining: number };

/** Баланс на един източник (полученото количество минус сумата на приспаднатите). */
export function inventoryBalance(received: number, allocatedQuantities: number[]): InventoryBalance {
  const sold = round3(allocatedQuantities.reduce((s, q) => s + (q > 0 ? q : 0), 0));
  return { received: round3(received), sold, remaining: round3(received - sold) };
}

/**
 * Проверява дали може да се продаде `qty` от източника, БЕЗ да се надвиши остатъкът.
 * Няма позволен override — двойна продажба на една стока е недопустима (раздел 34).
 */
export function canSellQuantity(received: number, allocatedQuantities: number[], qty: number): { ok: boolean; remaining: number; remainingAfter: number } {
  const { remaining } = inventoryBalance(received, allocatedQuantities);
  const remainingAfter = round3(remaining - qty);
  return { ok: qty > 0 && remainingAfter >= 0, remaining, remainingAfter };
}
