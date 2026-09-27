#!/usr/bin/env node
/**
 * Реконсилиация на автопарка спрямо клиентския Excel „Камиони.xlsx" (41 активни композиции).
 * DRY-RUN по подразбиране; записва САМО с --apply. Company-scoped. Никакви deletes. Не пипа
 * исторически snapshots (ExportDocumentSet.truckRegSnapshot/trailerReg остават замразени).
 *
 *   node scripts/reconcile-logistics-fleet.mjs                 # DRY-RUN (всички logistics seller фирми)
 *   node scripts/reconcile-logistics-fleet.mjs --company-id=X  # DRY-RUN за конкретна фирма
 *   node scripts/reconcile-logistics-fleet.mjs --apply         # APPLY
 */
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const args = process.argv.slice(2);
const APPLY = args.includes("--apply");
const companyArg = (args.find((a) => a.startsWith("--company-id=")) || "").split("=")[1] || null;

// ── Нормализация (огледало на src/lib/logistics/normalize.ts) ──
const CYR = { "А":"A","В":"B","Е":"E","С":"C","О":"O","Р":"P","Н":"H","К":"K","М":"M","Т":"T","Х":"X" };
const foldCyrillic = (s) => (s ?? "").replace(/[АВЕСОРНКМТХ]/g, (c) => CYR[c] ?? c);
const normReg = (s) => foldCyrillic((s ?? "").toUpperCase()).replace(/[^A-Z0-9]/g, "");
const nameKey = (s) => foldCyrillic((s ?? "").toUpperCase()).replace(/\s+/g, " ").trim();

const CANONICAL_FLEET = [
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

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

async function resolveCompanies() {
  if (companyArg) {
    const c = await prisma.company.findUnique({ where: { id: companyArg }, select: { id: true, name: true, eik: true } });
    return c ? [c] : [];
  }
  const en = await prisma.companyModuleAccess.findMany({ where: { moduleKey: "logistics", enabled: true }, select: { companyId: true } });
  const companies = await prisma.company.findMany({ where: { id: { in: en.map((e) => e.companyId) } }, select: { id: true, name: true, eik: true, logisticsExportCreate: true } });
  return companies.filter((c) => c.logisticsExportCreate !== false); // само продавачите (owner на автопарка)
}

async function loadExisting(companyId) {
  const vehicles = await prisma.vehicle.findMany({
    where: { companyId, normalizedRegistration: { not: null } },
    select: {
      id: true, registration: true, normalizedRegistration: true, active: true,
      logisticsProfile: { select: { trailerReg: true, defaultDriver: true, carrier: { select: { name: true } } } },
      configurations: { select: { maxPayloadTons: true, active: true }, orderBy: { createdAt: "asc" } },
    },
  });
  return vehicles.map((v) => ({
    id: v.id, registration: v.registration, normalizedRegistration: v.normalizedRegistration, active: v.active,
    trailer: v.logisticsProfile?.trailerReg ?? null,
    carrierName: v.logisticsProfile?.carrier?.name ?? null,
    driver: v.logisticsProfile?.defaultDriver ?? null,
    capacity: v.configurations.find((c) => c.maxPayloadTons != null)?.maxPayloadTons ?? null,
  }));
}

function plan(existing) {
  const byKey = new Map(existing.filter((v) => v.normalizedRegistration).map((v) => [v.normalizedRegistration, v]));
  const rows = []; const canonicalKeys = new Set();
  for (const c of CANONICAL_FLEET) {
    const key = normReg(c.truck); canonicalKeys.add(key);
    const ex = byKey.get(key);
    if (!ex) { rows.push({ ...c, dbState: "—", action: "CREATE", notes: "нов", vehicleId: null }); continue; }
    const diffs = [];
    if (c.trailer && normReg(ex.trailer) !== normReg(c.trailer)) diffs.push("ремарке");
    if (c.carrier && nameKey(ex.carrierName) !== nameKey(c.carrier)) diffs.push("превозвач");
    if (c.driver && nameKey(ex.driver) !== nameKey(c.driver)) diffs.push("шофьор");
    if (c.capacity != null && ex.capacity !== c.capacity) diffs.push("капацитет");
    if (!ex.active) rows.push({ ...c, dbState: "неактивен", action: "ACTIVATE", notes: diffs.join(", "), vehicleId: ex.id });
    else if (diffs.length) rows.push({ ...c, dbState: "активен (diff)", action: "UPDATE", notes: diffs.join(", "), vehicleId: ex.id });
    else rows.push({ ...c, dbState: "активен", action: "KEEP_ACTIVE", notes: "", vehicleId: ex.id });
  }
  for (const v of existing) {
    if (!v.normalizedRegistration || canonicalKeys.has(v.normalizedRegistration) || !v.active) continue;
    rows.push({ truck: v.registration, trailer: v.trailer, carrier: v.carrierName ?? "—", driver: v.driver, capacity: v.capacity, dbState: "активен", action: "DEACTIVATE", notes: "няма в Excel", vehicleId: v.id });
  }
  return rows;
}

async function upsertCarrier(companyId, name) {
  const all = await prisma.carrier.findMany({ where: { companyId }, select: { id: true, name: true } });
  const hit = all.find((c) => nameKey(c.name) === nameKey(name));
  if (hit) return hit.id;
  const c = await prisma.carrier.create({ data: { companyId, name, active: true } });
  return c.id;
}

async function apply(companyId, rows) {
  let created = 0, activated = 0, updated = 0, deactivated = 0;
  for (const r of rows) {
    if (r.action === "DEACTIVATE") { await prisma.vehicle.update({ where: { id: r.vehicleId }, data: { active: false } }); deactivated++; continue; }
    const carrierId = r.carrier && r.carrier !== "—" ? await upsertCarrier(companyId, r.carrier) : null;
    let vehicleId = r.vehicleId;
    if (r.action === "CREATE") {
      const v = await prisma.vehicle.create({ data: { companyId, registration: r.truck.trim(), normalizedRegistration: normReg(r.truck), active: true } });
      vehicleId = v.id; created++;
    } else if (r.action === "ACTIVATE") { await prisma.vehicle.update({ where: { id: vehicleId }, data: { active: true } }); activated++; }
    else if (r.action === "UPDATE") updated++;
    // Профил (текуща композиция): trailer/carrier/driver. Празно в Excel → не презаписва (§15).
    const profData = {};
    if (r.trailer) profData.trailerReg = r.trailer.trim();
    if (carrierId) profData.carrierId = carrierId;
    if (r.driver) profData.defaultDriver = r.driver.trim();
    if (Object.keys(profData).length) {
      await prisma.vehicleLogisticsProfile.upsert({
        where: { vehicleId }, create: { vehicleId, ...profData, ownershipType: "carrier" }, update: profData,
      });
    }
    // Капацитет → primary VehicleConfiguration.maxPayloadTons (само ако Excel има стойност).
    if (r.capacity != null) {
      const trailerRegNorm = normReg(r.trailer);
      await prisma.vehicleConfiguration.upsert({
        where: { companyId_vehicleId_trailerRegNorm_cargoMode_carrierId: { companyId, vehicleId, trailerRegNorm, cargoMode: "", carrierId: carrierId ?? null } },
        create: { companyId, vehicleId, trailerReg: r.trailer, trailerRegNorm, carrierId, defaultDriver: r.driver ?? null, cargoMode: "", maxPayloadTons: r.capacity, active: true },
        update: { maxPayloadTons: r.capacity, active: true, ...(r.driver ? { defaultDriver: r.driver } : {}) },
      });
    }
  }
  return { created, activated, updated, deactivated };
}

function printPlan(company, rows) {
  console.log(`\n=== [${company.name}] (eik=${company.eik ?? "—"}) ===`);
  console.log("TRACTOR      | TRAILER      | CARRIER      | DRIVER                | CAP   | DB STATE        | ACTION       | NOTES");
  console.log("-".repeat(140));
  for (const r of rows) {
    console.log(
      String(r.truck).padEnd(12).slice(0,12) + " | " + String(r.trailer ?? "—").padEnd(12).slice(0,12) + " | " +
      String(r.carrier).padEnd(12).slice(0,12) + " | " + String(r.driver ?? "—").padEnd(21).slice(0,21) + " | " +
      String(r.capacity ?? "—").padEnd(5) + " | " + String(r.dbState).padEnd(15).slice(0,15) + " | " +
      String(r.action).padEnd(12) + " | " + r.notes);
  }
  const cnt = (a) => rows.filter((r) => r.action === a).length;
  const finalActive = cnt("KEEP_ACTIVE") + cnt("ACTIVATE") + cnt("UPDATE") + cnt("CREATE");
  console.log(`\nSummary [${company.name}]: Excel=${CANONICAL_FLEET.length} · KEEP=${cnt("KEEP_ACTIVE")} · ACTIVATE=${cnt("ACTIVATE")} · UPDATE=${cnt("UPDATE")} · CREATE=${cnt("CREATE")} · DEACTIVATE=${cnt("DEACTIVATE")} · FINAL ACTIVE=${finalActive}`);
  if (finalActive !== 41) console.log(`⚠ FINAL ACTIVE != 41 (${finalActive}) — прегледай преди apply.`);
}

async function main() {
  console.log(APPLY ? "*** APPLY MODE ***" : "DRY-RUN (само чете; --apply за запис)");
  const companies = await resolveCompanies();
  if (!companies.length) { console.log("Няма seller logistics фирма (--company-id или модул)."); return; }
  console.log("Целеви фирми:", companies.map((c) => c.name).join(", "));
  for (const c of companies) {
    const existing = await loadExisting(c.id);
    const rows = plan(existing);
    printPlan(c, rows);
    if (APPLY) { const res = await apply(c.id, rows); console.log(`APPLIED [${c.name}]:`, res); }
  }
  console.log(APPLY ? "\nГотово (APPLY)." : "\nГотово (DRY-RUN). Нищо не е записано.");
}
main().catch((e) => { console.error("ГРЕШКА:", e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
