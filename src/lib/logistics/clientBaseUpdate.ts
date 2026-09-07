/**
 * Чиста логика за master-data ъпдейта на логистичните клиенти (адрес на регистрация/база,
 * ЕДБ). Match: нормализиран ЕДБ (с махане на водещ „MK") → нормализирано име. Без fuzzy.
 * ЕДБ никога не се презаписва при конфликт (identity), само се допълва при празно.
 */
import { normalizeClientName } from "@/lib/logistics/clientDedupe";

/** Нормализира ЕДБ/данъчен: само буквено-цифрови, главни, без водещ държавен префикс „MK". */
export function normEikMk(eik: string | null | undefined): string | null {
  const v = (eik ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  const stripped = v.replace(/^MK/, "");
  return stripped || null;
}

export type ClientEntry = {
  key: string; name: string; eik: string | null; mb?: string | null;
  regAddress: string | null; baseAddress: string | null; city?: string | null; country?: string | null;
};
export type ExistingClient = {
  id: string; name: string; eik: string | null; address: string | null; baseAddress: string | null;
  city: string | null; country: string | null;
};

export type PlanAction = "CREATE" | "BASE_ADDRESS_UPDATE" | "NO_CHANGE" | "AMBIGUOUS";
export type FieldChange = { field: string; from: string | null; to: string | null };
export type ClientПlan = {
  key: string; action: PlanAction; matchReason: "EIK" | "name" | "NEW" | "ambiguous";
  clientId: string | null; currentName: string | null; targetName: string;
  changes: FieldChange[]; // САМО безопасните записи (baseAddress + попълване на празни полета)
  warnings: string[];     // различия в непразни master полета — НЕ се презаписват (§1/§9)
  manualReview: boolean;  // има ли различия за ръчен преглед (напр. EIK conflict)
  notes: string[];
};

const norm = (s: string | null | undefined) => (s ?? "").trim();
const diff = (from: string | null | undefined, to: string | null | undefined) => norm(from) !== norm(to);

/**
 * Планира действието за един запис спрямо съществуващите canonical клиенти (на SEM).
 * Не мутира нищо — само описва какво ще се направи (за dry-run и за --apply).
 */
export function planClientUpdate(entry: ClientEntry, existing: ExistingClient[]): ClientПlan {
  const eNorm = normEikMk(entry.eik);
  const nName = normalizeClientName(entry.name);
  const notes: string[] = [];
  if (entry.mb) notes.push(`M.B. ${entry.mb} — няма подходящо поле в Client; докладвано (не се записва).`);

  let candidates = eNorm
    ? existing.filter((c) => normEikMk(c.eik) === eNorm)
    : existing.filter((c) => normalizeClientName(c.name) === nName);
  let matchReason: "EIK" | "name" = eNorm ? "EIK" : "name";
  // Fallback: подаден ЕДБ без ЕДБ-съвпадение, но има запис със СЪЩОТО име → същият клиент
  // (различен/грешен ЕДБ). Мачваме по име, за да НЕ създаваме дубликат; ЕДБ конфликтът се отчита.
  if (eNorm && candidates.length === 0) {
    candidates = existing.filter((c) => normalizeClientName(c.name) === nName);
    if (candidates.length) matchReason = "name";
  }

  const base = { key: entry.key, targetName: entry.name, notes } as const;

  if (candidates.length > 1) {
    return { ...base, action: "AMBIGUOUS", matchReason: "ambiguous", clientId: null, currentName: null, changes: [], warnings: [`${candidates.length} съвпадения: ${candidates.map((c) => c.id).join(", ")}`], manualReview: true };
  }

  // CREATE — реално липсва: пълни master данни (§7/§10).
  if (candidates.length === 0) {
    const changes: FieldChange[] = [
      { field: "name", from: null, to: entry.name },
      { field: "eik", from: null, to: entry.eik },
      { field: "address", from: null, to: entry.regAddress },
      { field: "baseAddress", from: null, to: entry.baseAddress },
      { field: "city", from: null, to: entry.city ?? null },
      { field: "country", from: null, to: entry.country ?? null },
    ].filter((c) => norm(c.to));
    return { ...base, action: "CREATE", matchReason: "NEW", clientId: null, currentName: null, changes, warnings: [], manualReview: false };
  }

  // Съществуващ canonical: в ТОЗИ batch единственият разрешен write е baseAddress (§1/§9).
  // НИКОЕ друго master поле не се пише — дори празно (city/address/eik/country) остава както е.
  // Всички различия са само WARNING / MANUAL_REVIEW (§2).
  const c = candidates[0];
  const changes: FieldChange[] = [];
  const warnings: string[] = [];

  // Адрес на база — авторитетен от списъка (§6): update при подаден и различен; null не трие (§3).
  if (norm(entry.baseAddress) && diff(c.baseAddress, entry.baseAddress)) changes.push({ field: "baseAddress", from: c.baseAddress, to: entry.baseAddress });

  // Останалите полета — само отчет, без write (§1/§2). Различия в непразни стойности → warning.
  if (norm(entry.regAddress) && norm(c.address) && diff(c.address, entry.regAddress)) warnings.push(`registration address differs (current „${norm(c.address)}" ≠ provided „${norm(entry.regAddress)}") — запазен current`);
  if (norm(entry.city) && norm(c.city) && diff(c.city, entry.city)) warnings.push(`city differs (current „${norm(c.city)}" ≠ provided „${norm(entry.city)}") — запазен current`);
  if (norm(entry.name) && normalizeClientName(c.name) !== nName) warnings.push(`name differs (current „${norm(c.name)}" ≠ provided „${norm(entry.name)}") — запазено current`);
  if (norm(entry.eik) && norm(c.eik) && normEikMk(c.eik) !== eNorm) warnings.push(`EIK differs (current „${norm(c.eik)}" ≠ provided „${norm(entry.eik)}") — MANUAL_REVIEW, запазен current`);

  const action: PlanAction = changes.length ? "BASE_ADDRESS_UPDATE" : "NO_CHANGE";
  return { ...base, action, matchReason, clientId: c.id, currentName: c.name, changes, warnings, manualReview: warnings.length > 0 };
}
