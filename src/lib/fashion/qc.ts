/**
 * Чиста логика за контрол на качеството (QC) + мостри (§15, §16) — без DB.
 */

/** Решение за дефектна бройка. „repaired" се връща към готовите; „scrap" не влиза в продажба. */
export const DEFECT_DISPOSITIONS = [
  "repair", "repaired", "scrap", "second_quality", "sample", "marketing", "photoshoot", "gift", "internal",
] as const;
export type DefectDisposition = (typeof DEFECT_DISPOSITIONS)[number];

/** Видове мостри (§16) — не влизат в готовата продукция за продажба. */
export const SAMPLE_TYPES = [
  "first_sample", "fit_sample", "size_set", "photoshoot", "showroom", "approved", "internal",
] as const;
export type SampleType = (typeof SAMPLE_TYPES)[number];

/** Типове дефекти по подразбиране (§15) — редактируеми/разширяеми per company. */
export const DEFAULT_DEFECT_CATEGORIES: { code: string; name: string }[] = [
  { code: "crooked_seam", name: "Крив шев" },
  { code: "skipped_seam", name: "Пропуснат шев" },
  { code: "coverstitch", name: "Проблем с покривен шев" },
  { code: "fabric_defect", name: "Дефект на плат" },
  { code: "stain", name: "Петно" },
  { code: "cutting_error", name: "Грешка при кроене" },
  { code: "wrong_size", name: "Неправилен размер" },
  { code: "zipper", name: "Цип" },
  { code: "button", name: "Копче" },
  { code: "embroidery", name: "Бродерия" },
  { code: "hole", name: "Дупка" },
  { code: "other", name: "Друго" },
];

export type DefectLike = { quantity: number; disposition: string };

/**
 * Изчислява броевете на поръчката от източника (QC минавания + дефекти):
 *   good     = Σ преминали QC директно
 *   defective= Σ дефектни бройки
 *   repair   = Σ дефектни, чакащи поправка (disposition „repair")
 *   ready    = добри + успешно поправени (disposition „repaired")
 * Recompute-from-source → idempotent, без двойно броене при refresh.
 */
export function computeOrderCounts(goodQty: number, defects: DefectLike[]): { good: number; defective: number; repair: number; ready: number } {
  const defective = defects.reduce((s, d) => s + (d.quantity || 0), 0);
  const repair = defects.filter((d) => d.disposition === "repair").reduce((s, d) => s + (d.quantity || 0), 0);
  const repaired = defects.filter((d) => d.disposition === "repaired").reduce((s, d) => s + (d.quantity || 0), 0);
  return { good: goodQty, defective, repair, ready: goodQty + repaired };
}
