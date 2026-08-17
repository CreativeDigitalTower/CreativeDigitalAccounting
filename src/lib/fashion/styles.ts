/**
 * Чиста логика за модели/кройки (Phase 3) — без DB, тестируемо изолирано.
 */

/** Статуси на модел (Style Master, §5). Локализират се в UI през i18n. */
export const STYLE_STATUSES = [
  "idea", "development", "first_sample", "fit_sample", "approved",
  "ready_for_production", "in_production", "active", "archived",
] as const;
export type StyleStatus = (typeof STYLE_STATUSES)[number];

/** Статуси на кройка (Pattern, §6). */
export const PATTERN_STATUSES = ["draft", "approved", "archived"] as const;
export type PatternStatus = (typeof PATTERN_STATUSES)[number];

/** Видове снимки на модел. */
export const STYLE_PHOTO_KINDS = ["product", "on_model", "other"] as const;
export type StylePhotoKind = (typeof STYLE_PHOTO_KINDS)[number];

/** Парсва свободен списък „S, M, L" / „S,M,L" → нормализиран масив без дубликати. */
export function parseList(input: string | null | undefined): string[] {
  if (!input) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of input.split(/[,\n;]/).map((s) => s.trim()).filter(Boolean)) {
    const key = part.toUpperCase();
    if (!seen.has(key)) { seen.add(key); out.push(part); }
  }
  return out;
}

// Стандартни кодове за често срещани цветове (по конвенция в модата). Fallback = първите 3 букви.
const COLOR_CODES: Record<string, string> = {
  black: "BLK", white: "WHT", red: "RED", blue: "BLU", green: "GRN", grey: "GRY", gray: "GRY",
  beige: "BEI", navy: "NVY", pink: "PNK", yellow: "YEL", orange: "ORG", purple: "PRP", brown: "BRN",
};
/** Код на цвят за SKU: известен код или първите 3 главни букви. */
export function colorCode(color?: string | null): string {
  if (!color) return "";
  const key = color.trim().toLowerCase();
  return COLOR_CODES[key] ?? color.trim().toUpperCase().replace(/\s+/g, "").slice(0, 3);
}

/**
 * SKU на вариант: {prefix}-{colorCode}-{size} (главни букви, без интервали).
 * Пример: buildVariantSku("EX-SD", "Black", "S") → „EX-SD-BLK-S".
 */
export function buildVariantSku(prefix: string, color?: string | null, size?: string | null): string {
  const norm = (s: string) => s.trim().toUpperCase().replace(/\s+/g, "");
  const parts = [prefix ? norm(prefix) : "", colorCode(color), size ? norm(size) : ""].filter(Boolean);
  return parts.join("-");
}

/** Следваща версия на кройка = max(съществуващи) + 1 (никога не презаписва стара). */
export function nextPatternVersion(existingVersions: number[]): number {
  return existingVersions.length ? Math.max(...existingVersions) + 1 : 1;
}
