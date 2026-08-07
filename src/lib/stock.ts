// ─────────────────────────────────────────────────────────────────────────
// Складова логика — FIFO разпределение по партиди, свободно/резервирано
// количество и статус на срока на годност. Чисти функции (тествани), без
// странични ефекти — ползват се от warehouse рутовете и справките.
// ─────────────────────────────────────────────────────────────────────────

export type BatchLike = { id: string; quantity: number; createdAt?: Date | string | null; deliveryDate?: Date | string | null };
export type FifoAllocation = { batchId: string; take: number };
export type FifoResult = { allocations: FifoAllocation[]; allocated: number; shortfall: number };

function keyOf(b: BatchLike): number {
  const d = b.deliveryDate ?? b.createdAt;
  return d ? new Date(d).getTime() : 0;
}

/**
 * Разпределя `needed` количество по партиди по FIFO (най-старите първо).
 * Връща какво да се вземе от всяка партида + недостиг, ако партидите не стигат.
 * НЕ мутира входа.
 */
export function allocateFifo(batches: BatchLike[], needed: number): FifoResult {
  const allocations: FifoAllocation[] = [];
  let remaining = Math.max(0, needed);
  const sorted = [...batches].filter((b) => b.quantity > 0).sort((a, b) => keyOf(a) - keyOf(b));
  for (const b of sorted) {
    if (remaining <= 0) break;
    const take = Math.min(b.quantity, remaining);
    if (take > 0) { allocations.push({ batchId: b.id, take: +take.toFixed(6) }); remaining -= take; }
  }
  return { allocations, allocated: +(needed - remaining).toFixed(6), shortfall: +Math.max(0, remaining).toFixed(6) };
}

/** Свободно количество = наличност − резервирано (не по-малко от 0). */
export function freeQuantity(quantity: number, reservedQuantity: number): number {
  return +Math.max(0, quantity - Math.max(0, reservedQuantity)).toFixed(6);
}

export type ExpiryStatus = "none" | "ok" | "soon" | "expired";
export type ExpiryInfo = { status: ExpiryStatus; days: number | null };

/**
 * Статус на срок на годност спрямо „днес" (date-only):
 *   expired < 0 дни · soon ≤ прага (по подразбиране 30) · ok иначе · none = без срок.
 */
export function batchExpiryStatus(expiry: Date | string | null | undefined, now: Date = new Date(), soonDays = 30): ExpiryInfo {
  if (!expiry) return { status: "none", days: null };
  const startOfDay = (d: Date) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x.getTime(); };
  const days = Math.round((startOfDay(new Date(expiry)) - startOfDay(now)) / 86400000);
  if (days < 0) return { status: "expired", days };
  if (days <= soonDays) return { status: "soon", days };
  return { status: "ok", days };
}
