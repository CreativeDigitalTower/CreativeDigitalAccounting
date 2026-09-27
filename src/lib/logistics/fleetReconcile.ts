/**
 * Реконсилиация на автопарка спрямо клиентския Excel „Камиони.xlsx" (source of truth за
 * ТЕКУЩО активните композиции). Чиста, тествана логика — ползва се от dry-run/apply скрипта.
 *
 * Правила:
 *   - Композициите в Excel → ACTIVE; всички други за фирмата → INACTIVE (§7). Нищо не се трие.
 *   - Matching по normalizeRegistration (fold кирилица→латиница) → без Latin/Cyrillic дубли (§11).
 *   - Optional поле празно в Excel (напр. capacity) → НЕ презаписва съществуващата стойност (§15).
 *   - Master update НЕ пипа исторически snapshots — това е гаранция на schema-та
 *     (ExportDocumentSet.truckRegSnapshot/trailerReg са замразени при създаване, §5/§16).
 *   - Шофьорът е низ (VehicleLogisticsProfile.defaultDriver) — не се merge-ват „хора"; просто
 *     се актуализира текущият шофьор на композицията (§13/§16). Без REVIEW за хора.
 */
import { normalizeRegistration, foldCyrillic } from "@/lib/logistics/normalize";

export type CanonicalVehicle = { truck: string; trailer: string | null; carrier: string; driver: string | null; capacity: number | null };

export const CANONICAL_FLEET: CanonicalVehicle[] = [
  { truck: "SK3362AB", trailer: "SK939TH", carrier: "ТргоМетал", driver: "Сашо Митковски", capacity: 26.5 },
  { truck: "SK498SL", trailer: "SK5020AE", carrier: "ТргоМетал", driver: "Слободан Митковски", capacity: 26.5 },
  { truck: "SK501TО", trailer: "SK5022АЕ", carrier: "ТргоМетал", driver: "Борис Николовски", capacity: 26.5 },
  { truck: "SK581TO", trailer: "SK728SV", carrier: "ТргоМетал", driver: "Саше Якимовски", capacity: 26.5 },
  { truck: "SK6539AО", trailer: "SK891TR", carrier: "ТргоМетал", driver: "Сладжан Станчевски", capacity: 26 },
  { truck: "SK7331AU", trailer: "SK842SV", carrier: "ТргоМетал", driver: "Аце Николовски", capacity: 26 },
  { truck: "SK7503BV", trailer: "SK1986AB", carrier: "ТргоМетал", driver: "Деян Стояновски", capacity: 26.5 },
  { truck: "SK832UU", trailer: "SK5021AE", carrier: "ТргоМетал", driver: "Лазе Стефковски", capacity: null },
  { truck: "SK3832BO", trailer: "SK7430BI", carrier: "Гриц", driver: "Сашо Кочовски", capacity: 27.5 },
  { truck: "SK5189BA", trailer: "SK4233BL", carrier: "Гриц", driver: "Бобан Кръстановски", capacity: 27.5 },
  { truck: "SK8565BD", trailer: "SK9373AS", carrier: "Гриц", driver: "Игор Кръстановски", capacity: 27.5 },
  { truck: "SK9891BD", trailer: "SK9836AD", carrier: "Гриц", driver: "Драги Блажевски", capacity: null },
  { truck: "СВ0024СА", trailer: "С6811ЕМ", carrier: "Trans", driver: "ЯВОР ДИМИТРОВ", capacity: null },
  { truck: "СВ0638АТ", trailer: "СВ2763ЕА", carrier: "Trans", driver: "АНДРЕЙ АНДРЕЕВ", capacity: null },
  { truck: "CB0639AT", trailer: "CB2649EA", carrier: "Trans", driver: "МИРОСЛАВ ВАСИЛЕВ", capacity: null },
  { truck: "CB1522CK", trailer: "CB3478EA", carrier: "Trans", driver: "ИВАЙЛО АНГЕЛОВ", capacity: null },
  { truck: "CB1639AH", trailer: "CB2944EA", carrier: "Trans", driver: "Радостин Димитров", capacity: null },
  { truck: "CB4986PX", trailer: "C5826EM", carrier: "Trans", driver: "СВЕТОМИР ПЕТРОВ", capacity: null },
  { truck: "СВ5038BB", trailer: "СB2762EA", carrier: "Trans", driver: "ТРАЯН ВЪРБАНОВ", capacity: null },
  { truck: "CB6215AH", trailer: "CB2945EA", carrier: "Trans", driver: "ТОДОР ТОДОРОВ", capacity: null },
  { truck: "СВ7765PP", trailer: "CB5232EP", carrier: "Trans", driver: "АНТОН ИГНАТОВ", capacity: null },
  { truck: "СВ8055CK", trailer: "CB0094EA", carrier: "Trans", driver: "Димитър Даскалов", capacity: null },
  { truck: "СВ8296HE", trailer: "B5248EH", carrier: "Trans", driver: "АНГЕЛ АЛЕКСАНДРОВ", capacity: null },
  { truck: "ST2899AE", trailer: "ST9339AD", carrier: "Ископ", driver: "Виктор Горгиевски", capacity: 26.5 },
  { truck: "ST7344AE", trailer: "ST6054AE", carrier: "Ископ", driver: "Ненад Стаменковски", capacity: 26.5 },
  { truck: "ST8669AE", trailer: "ST5407AE", carrier: "Ископ", driver: "Сашко Митьовски", capacity: null },
  { truck: "SK0952AR", trailer: "SK4736AN", carrier: "Tanigo Sped", driver: "Виктор Горгиевски", capacity: null },
  { truck: "ST1344AD", trailer: "ST0215AE", carrier: "ДАЦ-МИ", driver: "Благой Яневски", capacity: 26 },
  { truck: "ST8344AC", trailer: "ST8717AD", carrier: "ДАЦ-МИ", driver: "Роберт Лазаров", capacity: 26 },
  { truck: "ST9838AC", trailer: "ST6050AE", carrier: "ДАЦ-МИ", driver: "Ангелчо Коцев", capacity: null },
  { truck: "KH8165KA", trailer: "KH1296EE", carrier: "Торби", driver: "Александър Пешовски", capacity: null },
  { truck: "KH4788KB", trailer: "KH2765EE", carrier: "Торби", driver: "Филип Пешовски", capacity: null },
  { truck: "KH7406BA", trailer: "CB2137EA", carrier: "Торби", driver: "Тони Ристовски", capacity: null },
  { truck: "CB7559KA", trailer: "KH1631EE", carrier: "Торби", driver: "Зоран Вучевски", capacity: null },
  { truck: "KP4622AC", trailer: "KP8465AB", carrier: "Торби", driver: "Ненад Митровски", capacity: null },
  { truck: "KP4240AC", trailer: "KP8491AB", carrier: "Торби", driver: "Синиша Стояновски", capacity: null },
  { truck: "KP0127AB", trailer: "KP8524AB", carrier: "Торби", driver: "Саше Тасев", capacity: null },
  { truck: "CB9510MA", trailer: "KH1346EE", carrier: "Торби", driver: "Игор Тодоровски", capacity: null },
  { truck: "ST6044AC", trailer: "ST5153AD", carrier: "Торби", driver: "Никола Кръстевски", capacity: null },
  { truck: "ST5052AD", trailer: "ST8741AD", carrier: "Торби", driver: "Коле Грбев", capacity: null },
  { truck: "KH2069BM", trailer: "KH0190EE", carrier: "Торби", driver: "Далибор Китановски", capacity: null },
];

export type ExistingVehicle = {
  id: string; registration: string; normalizedRegistration: string; active: boolean;
  trailer: string | null; carrierName: string | null; driver: string | null; capacity: number | null;
};
export type FleetAction = "KEEP_ACTIVE" | "ACTIVATE" | "UPDATE" | "CREATE" | "DEACTIVATE";
export type FleetPlanRow = {
  truck: string; trailer: string | null; carrier: string; driver: string | null; capacity: number | null;
  dbState: string; action: FleetAction; notes: string; vehicleId: string | null;
};
export type FleetPlan = { rows: FleetPlanRow[]; summary: Record<string, number> & { excelRows: number; finalActive: number } };

const nameKey = (s: string | null | undefined) => foldCyrillic((s ?? "").toUpperCase()).replace(/\s+/g, " ").trim();

/** Изчислява плана за реконсилиация (без DB writes) — за dry-run и за apply. */
export function planFleetReconcile(existing: ExistingVehicle[], canonical: CanonicalVehicle[] = CANONICAL_FLEET): FleetPlan {
  const byKey = new Map<string, ExistingVehicle>();
  for (const v of existing) if (v.normalizedRegistration) byKey.set(v.normalizedRegistration, v);

  const rows: FleetPlanRow[] = [];
  const canonicalKeys = new Set<string>();

  for (const c of canonical) {
    const key = normalizeRegistration(c.truck);
    canonicalKeys.add(key);
    const ex = byKey.get(key);
    if (!ex) {
      rows.push({ ...c, dbState: "—", action: "CREATE", notes: "нов автомобил (не съществува)", vehicleId: null });
      continue;
    }
    // Разлики (Excel има стойност → сравняваме; capacity празно в Excel → не се пипа, §15).
    const diffs: string[] = [];
    if (c.trailer && normalizeRegistration(ex.trailer) !== normalizeRegistration(c.trailer)) diffs.push("ремарке");
    if (c.carrier && nameKey(ex.carrierName) !== nameKey(c.carrier)) diffs.push("превозвач");
    if (c.driver && nameKey(ex.driver) !== nameKey(c.driver)) diffs.push("шофьор");
    if (c.capacity != null && ex.capacity !== c.capacity) diffs.push("капацитет");

    if (!ex.active) {
      rows.push({ ...c, dbState: "неактивен" + (diffs.length ? `, разлики: ${diffs.join("/")}` : ""), action: "ACTIVATE", notes: diffs.length ? `активиране + update (${diffs.join(", ")})` : "активиране", vehicleId: ex.id });
    } else if (diffs.length) {
      rows.push({ ...c, dbState: `активен, разлики: ${diffs.join("/")}`, action: "UPDATE", notes: diffs.join(", "), vehicleId: ex.id });
    } else {
      rows.push({ ...c, dbState: "активен", action: "KEEP_ACTIVE", notes: "", vehicleId: ex.id });
    }
  }

  // Съществуващи активни, които НЕ са в Excel → деактивиране (без триене, §7/§8).
  for (const v of existing) {
    if (!v.normalizedRegistration || canonicalKeys.has(v.normalizedRegistration)) continue;
    if (!v.active) continue;
    rows.push({ truck: v.registration, trailer: v.trailer, carrier: v.carrierName ?? "—", driver: v.driver, capacity: v.capacity, dbState: "активен (няма в Excel)", action: "DEACTIVATE", notes: "не е в актуалния Excel", vehicleId: v.id });
  }

  const summary: FleetPlan["summary"] = {
    excelRows: canonical.length,
    KEEP_ACTIVE: rows.filter((r) => r.action === "KEEP_ACTIVE").length,
    ACTIVATE: rows.filter((r) => r.action === "ACTIVATE").length,
    UPDATE: rows.filter((r) => r.action === "UPDATE").length,
    CREATE: rows.filter((r) => r.action === "CREATE").length,
    DEACTIVATE: rows.filter((r) => r.action === "DEACTIVATE").length,
    finalActive: 0,
  };
  // Финален брой активни = всички canonical (те стават/остават активни).
  summary.finalActive = summary.KEEP_ACTIVE + summary.ACTIVATE + summary.UPDATE + summary.CREATE;
  return { rows, summary };
}
