/**
 * Чиста логика за откриване/обединяване на дублирани клиенти (§3). Тествана изолирано.
 * Приоритет на съвпадение: (1) нормализиран ЕИК/данъчен номер (силен ключ), (2) нормализирано
 * име. БЕЗ fuzzy similarity — ambiguous случаи НЕ се обединяват автоматично.
 */

/** Нормализира ЕИК/данъчен номер: само буквено-цифрови, главни. Празно → null. */
export function normalizeEik(eik: string | null | undefined): string | null {
  const v = (eik ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  return v || null;
}

/** Нормализира фирмено име: главни, без пунктуация/тирета/интервали. НЕ фолдва кирилица↔латиница
 * (различните азбуки остават различни — безопасно, §3). Празно → "". */
export function normalizeClientName(name: string | null | undefined): string {
  return (name ?? "")
    .toUpperCase()
    .replace(/[.,/()"'`«»„“”-]/g, "")
    .replace(/\s+/g, "")
    .trim();
}

export type DedupeClient = {
  id: string;
  name: string;
  eik: string | null;
  createdAt?: string | Date | null;
  // тегло за избор на canonical (напр. брой релации/пълнота)
  relationCount?: number;
  filledFields?: number;
};

/** Ключ за групиране: ЕИК (ако има) има приоритет; иначе нормализираното име. */
export function clientMatchKey(c: { eik: string | null; name: string }): string {
  const eik = normalizeEik(c.eik);
  return eik ? `eik:${eik}` : `name:${normalizeClientName(c.name)}`;
}

/**
 * Групира дубликати по match key. Връща само групи с >1 запис. Записи с празно име и без
 * ЕИК се пропускат (не групираме „нищо"). Групите са детерминистично сортирани.
 */
export function groupDuplicates(clients: DedupeClient[]): DedupeClient[][] {
  const map = new Map<string, DedupeClient[]>();
  for (const c of clients) {
    const key = clientMatchKey(c);
    if (key === "name:") continue; // празно име без ЕИК
    (map.get(key) ?? map.set(key, []).get(key)!).push(c);
  }
  return [...map.values()].filter((g) => g.length > 1);
}

/**
 * Избира canonical запис от група дубликати: най-много релации, при равенство — най-много
 * попълнени полета, при равенство — най-старият (най-малък createdAt), при равенство — по id.
 */
export function pickCanonical(group: DedupeClient[]): DedupeClient {
  const t = (d: DedupeClient) => (d.createdAt ? new Date(d.createdAt).getTime() : Number.MAX_SAFE_INTEGER);
  return [...group].sort((a, b) =>
    (b.relationCount ?? 0) - (a.relationCount ?? 0) ||
    (b.filledFields ?? 0) - (a.filledFields ?? 0) ||
    t(a) - t(b) ||
    a.id.localeCompare(b.id),
  )[0];
}

/** Полетата, които могат безопасно да се допълнят от duplicate → canonical, ако canonical е празен (§6). */
export const MERGEABLE_FIELDS = ["eik", "vatNumber", "address", "baseAddress", "city", "country", "phone", "contactEmail", "contactPerson", "mol"] as const;
export type MergeableField = (typeof MERGEABLE_FIELDS)[number];

/**
 * Изчислява безопасните field merges (canonical празно + duplicate има стойност) и конфликтите
 * (двете имат РАЗЛИЧНИ непразни стойности → не се презаписва, само се докладва, §6).
 */
export function computeFieldMerges(
  canonical: Record<string, unknown>,
  duplicate: Record<string, unknown>,
): { fills: Record<string, string>; conflicts: { field: string; canonical: string; duplicate: string }[] } {
  const fills: Record<string, string> = {};
  const conflicts: { field: string; canonical: string; duplicate: string }[] = [];
  for (const f of MERGEABLE_FIELDS) {
    const cv = (canonical[f] ?? "").toString().trim();
    const dv = (duplicate[f] ?? "").toString().trim();
    if (!dv) continue;
    if (!cv) fills[f] = dv;
    else if (cv.toLowerCase() !== dv.toLowerCase()) conflicts.push({ field: f, canonical: cv, duplicate: dv });
  }
  return { fills, conflicts };
}
