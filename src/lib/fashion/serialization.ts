/**
 * Чиста логика за опционална сериализация (LIMITED продукти, §27) — без DB.
 */

/** Статуси на сериализирана бройка. */
export const SERIAL_STATUSES = ["available", "reserved", "sold", "gift", "marketing", "defective"] as const;
export type SerialStatus = (typeof SERIAL_STATUSES)[number];

/**
 * Форматира сериен номер: „037 / 100". Ширината на паддинга е по броя цифри на тиража
 * (минимум 3). Без тираж → само номерът с 3 цифри.
 */
export function formatSerial(serial: number, editionSize?: number | null): string {
  const width = Math.max(3, String(editionSize ?? 0).length);
  const n = String(serial).padStart(width, "0");
  return editionSize && editionSize > 0 ? `${n} / ${editionSize}` : n;
}

/** Следващ сериен номер = max(съществуващи) + 1 (никога не преизползва). */
export function nextSerial(existing: number[]): number {
  return existing.length ? Math.max(...existing) + 1 : 1;
}

/** Броеве по статус (available/sold/gift/…). */
export function serialStatusCounts(units: { status: string }[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const s of SERIAL_STATUSES) counts[s] = 0;
  for (const u of units) counts[u.status] = (counts[u.status] ?? 0) + 1;
  return counts;
}

/** Оставащи серийни номера до тиража (не под 0). */
export function remainingEdition(editionSize: number | null | undefined, issued: number): number {
  if (!editionSize || editionSize <= 0) return Infinity;
  return Math.max(0, editionSize - issued);
}
