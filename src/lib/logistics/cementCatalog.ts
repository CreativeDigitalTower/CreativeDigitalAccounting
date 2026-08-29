/**
 * ЕДИНСТВЕН source of truth за canonical видовете цимент (§1/§15). UI dropdown-ите и
 * sync-ът четат оттук — НИКОГА hardcode на марки в отделните форми.
 *
 * КРИТИЧНО (§1): изписването на `canonicalName` се пази ТОЧНО както е подадено от клиента
 * (напр. „CEM II B0LL 52.5 N" с нула). Не се „коригира" автоматично.
 */
import { normalizeProductKey } from "@/lib/logistics/normalize";

export type CementCategory = "bulk" | "packaged";

export type CementProduct = {
  canonicalName: string;
  category: CementCategory;
  unit: string;
  packaging: string | null;
  aliases: string[];
};

// Точните шест canonical марки (изписване както е зададено, §1/§26).
export const CEMENT_CATALOG: CementProduct[] = [
  // ── НАСИПЕН / BULK ─────────────────────────────────────────────
  { canonicalName: "CEM II A-LL 52.5 N", category: "bulk", unit: "t", packaging: null, aliases: ["CEM II A-LL 52,5 N", "A-LL 52.5 N", "A-LL 52,5 N", "CEM II / A-LL 52,5 N"] },
  { canonicalName: "CEM II A-LL 42.5 R", category: "bulk", unit: "t", packaging: null, aliases: ["CEM II A-LL 42,5 R", "CEM II 42,5 R", "CEM II 42.5 R", "CEM II/A-LL 42,5 R"] },
  { canonicalName: "CEM II B0LL 52.5 N", category: "bulk", unit: "t", packaging: null, aliases: ["CEM II B0LL 52,5 N"] },
  // ── ПАКЕТИРАН / PACKAGED ───────────────────────────────────────
  { canonicalName: "CEM II B-LL 42.5 R", category: "packaged", unit: "t", packaging: "25 kg bags", aliases: ["CEM II B-LL 42,5 R", "B-LL 42.5 R", "B-LL 42,5 R", "CEM II / B-LL 42,5 R"] },
  { canonicalName: "CEM II B-LL 32.5 R", category: "packaged", unit: "t", packaging: "25 kg bags", aliases: ["CEM II B-LL 32,5 R", "B-LL 32.5 R", "B-LL 32,5 R"] },
  { canonicalName: "CEM II C-M V-LL 42.5 N", category: "packaged", unit: "t", packaging: "25 kg bags", aliases: ["CEM II C-M V-LL 42,5 N", "C-M V-LL 42.5 N", "C-M (V-LL) 42,5 N"] },
];

/**
 * Известни СТАРИ system-default марки от предишния seed, които вече не са валидни (§2).
 * Sync-ът архивира само тях (по нормализиран ключ) — така НИКОГА не архивира custom
 * продукт на клиента (§16E/§17). Списъкът е изричен, не се гадае.
 */
export const LEGACY_DEFAULT_NAMES: string[] = [
  "CEM II B-V 52.5 N",
  "CEM I 52.5 R",
  "CEM I 52.5 N",
  "DEGASET",
  "CEM IV B(V) 42.5 N",
];

export const CANONICAL_KEYS = new Set(CEMENT_CATALOG.map((p) => normalizeProductKey(p.canonicalName)));
export const LEGACY_KEYS = new Set(LEGACY_DEFAULT_NAMES.map((n) => normalizeProductKey(n)));

export function isCementCategory(v: string | null | undefined): v is CementCategory {
  return v === "bulk" || v === "packaged";
}

export type SyncAction = "KEEP" | "CREATE" | "ARCHIVE" | "SKIP";

/**
 * Класификация на едно решение при sync (§17) — чиста функция за тестове и за скрипта.
 * - canonical, съществува        → KEEP (обнови category/active)
 * - canonical, липсва            → CREATE
 * - известен стар default, активен → ARCHIVE
 * - всичко друго (custom)         → SKIP (не се пипа)
 */
export function classifyProduct(input: { normalizedName: string; existsActive: boolean | null }): SyncAction {
  const isCanonical = CANONICAL_KEYS.has(input.normalizedName);
  if (isCanonical) return input.existsActive === null ? "CREATE" : "KEEP";
  if (LEGACY_KEYS.has(input.normalizedName) && input.existsActive === true) return "ARCHIVE";
  return "SKIP";
}

/** Списък от нормализираните ключове на canonical марки, липсващи в дадено множество. */
export function missingCanonical(existingNormalizedNames: Iterable<string>): CementProduct[] {
  const present = new Set(existingNormalizedNames);
  return CEMENT_CATALOG.filter((p) => !present.has(normalizeProductKey(p.canonicalName)));
}
