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

  // Съществуващ canonical: САМО baseAddress + попълване на празни полета. Непразните master
  // полета НЕ се презаписват — само warning (§1/§6/§9).
  const c = candidates[0];
  const changes: FieldChange[] = [];
  const warnings: string[] = [];

  // Адрес на база — авторитетен от списъка (§6): update при подаден и различен; null не трие (§3/§4).
  if (norm(entry.baseAddress) && diff(c.baseAddress, entry.baseAddress)) changes.push({ field: "baseAddress", from: c.baseAddress, to: entry.baseAddress });
  // Адрес на регистрация — попълва се само при празно; иначе запазва се + warning (§2/§5).
  if (norm(entry.regAddress)) {
    if (!norm(c.address)) changes.push({ field: "address", from: c.address, to: entry.regAddress });
    else if (diff(c.address, entry.regAddress)) warnings.push(`registration address differs (current „${norm(c.address)}" ≠ provided „${norm(entry.regAddress)}") — запазен current`);
  }
  // Град — попълва се само при празно.
  if (norm(entry.city)) {
    if (!norm(c.city)) changes.push({ field: "city", from: c.city, to: entry.city ?? null });
    else if (diff(c.city, entry.city)) warnings.push(`city differs (current „${norm(c.city)}" ≠ provided „${norm(entry.city)}") — запазен current`);
  }
  // Държава — попълва се само при празно.
  if (norm(entry.country) && !norm(c.country)) changes.push({ field: "country", from: c.country, to: entry.country ?? null });
  // Име — никога не се преименува автоматично; warning само при различие в НОРМАЛИЗИРАНОТО име.
  if (norm(entry.name) && normalizeClientName(c.name) !== nName) warnings.push(`name differs (current „${norm(c.name)}" ≠ provided „${norm(entry.name)}") — запазено current`);
  // ЕДБ — попълва се при празно; различна непразна стойност → MANUAL_REVIEW, НЕ блокира baseAddress (§4/§6).
  if (norm(entry.eik)) {
    if (!norm(c.eik)) changes.push({ field: "eik", from: c.eik ?? null, to: entry.eik });
    else if (normEikMk(c.eik) !== eNorm) warnings.push(`EIK differs (current „${norm(c.eik)}" ≠ provided „${norm(entry.eik)}") — MANUAL_REVIEW, запазен current`);
  }

  const action: PlanAction = changes.length ? "BASE_ADDRESS_UPDATE" : "NO_CHANGE";
  return { ...base, action, matchReason, clientId: c.id, currentName: c.name, changes, warnings, manualReview: warnings.length > 0 };
}
