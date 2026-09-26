#!/usr/bin/env node
/**
 * Recovery / backfill на LogisticsDestination master data (regression след PR #213).
 *
 * БЕЗОПАСНОСТ:
 *   - По подразбиране DRY-RUN (само чете и печата). Записва САМО с --apply.
 *   - НИКОГА не трие. НИКОГА не пипа finalized document snapshots (само destinationId relation).
 *   - НЕ измисля адреси: ако адрес липсва в старите данни → nullable + маркиран MISSING.
 *   - Company-scoped: обработва само подадената --company-id ИЛИ фирмите с активиран
 *     logistics модул (никога Super Admin лична фирма по погрешка).
 *
 * Употреба:
 *   node scripts/recover-logistics-destinations.mjs                 # dry-run, всички logistics фирми
 *   node scripts/recover-logistics-destinations.mjs --company-id=... # dry-run за една фирма
 *   node scripts/recover-logistics-destinations.mjs --apply          # APPLY (запис в DB)
 *
 * Изисква DATABASE_URL в средата (както приложението).
 */
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// ── Аргументи ──
const args = process.argv.slice(2);
const APPLY = args.includes("--apply");
const companyArg = (args.find((a) => a.startsWith("--company-id=")) || "").split("=")[1] || null;

// ── Нормализация (огледало на src/lib/logistics/deliveryTerms.ts) ──
const CYR2LAT = { а:"a",б:"b",в:"v",г:"g",д:"d",е:"e",ж:"z",з:"z",и:"i",й:"i",к:"k",л:"l",м:"m",н:"n",о:"o",п:"p",р:"r",с:"s",т:"t",у:"u",ф:"f",х:"h",ц:"c",ч:"c",ш:"s",щ:"s",ъ:"a",ю:"u",я:"a",ј:"j",ќ:"k",ѓ:"g",љ:"lj",њ:"nj",џ:"d" };
const DEST_EN_OVERRIDE = { "скопие":"SKOPIE","скопjе":"SKOPIE","skopje":"SKOPIE","тетово":"TETOVO","бели извор":"BELI IZVOR" };
function destinationEn(v) {
  const d = (v ?? "").trim(); if (!d) return "";
  const ov = DEST_EN_OVERRIDE[d.toLowerCase()]; if (ov) return ov;
  return d.split("").map((ch) => CYR2LAT[ch.toLowerCase()] ? (ch === ch.toUpperCase() ? CYR2LAT[ch.toLowerCase()].toUpperCase() : CYR2LAT[ch.toLowerCase()]) : ch).join("").toUpperCase();
}
function normalizeDestination(v) { return destinationEn(v).toLowerCase().replace(/[^a-z0-9]/g, ""); }
function stripDeliveryTermSuffix(raw) { const s = (raw ?? "").trim(); if (!s) return ""; const i = s.indexOf("/"); return (i >= 0 ? s.slice(0, i) : s).trim(); }

// ── Известни source-of-truth стойности (огледало на destinations.ts / masterData.ts) ──
const INACTIVE_NAMES = ["Batinci","Butel","Dolno Konjari","Gostivar","Jakimovo","Lipkovo","Nikushtak","Orizari","Petrovac","Petrovec","Rzanicino","Vizbegovo","Vraca","Vratsa","Враца"];
const INACTIVE_KEYS = new Set(INACTIVE_NAMES.map(normalizeDestination).filter(Boolean));
const MK_DESTINATIONS = ["SKOPIE","PETROVEC","GOSTIVAR","KUMANOVO","STRUMICA","VINICA","TETOVO","KRIVA PALANKA","SHTIP","LIPKOVO","KOCHANI","DOLNO KONJARI","RZANICINO","BATINCI","JAKIMOVO","NIKUSHTAK","ORIZARI","VIZBEGOVO","BUTEL"];
const SEED_DESTINATIONS = ["Скопие","Кочани","Ранковце","Кр. Паланка","Куманово"];
const SEED_ACTIVE = [
  { name: "Skopie", country: "North Macedonia" }, { name: "Kumanovo", country: "North Macedonia" },
  { name: "Strumica", country: "North Macedonia" }, { name: "Vinica", country: "North Macedonia" },
  { name: "Tetovo", country: "North Macedonia" }, { name: "Kriva Palanka", country: "North Macedonia" },
  { name: "Shtip", country: "North Macedonia" }, { name: "Kochani", country: "North Macedonia" },
  { name: "Rankovce", country: "North Macedonia" },
];
// Държава по нормализиран ключ (само за потвърдени; иначе null — не се измисля).
const COUNTRY_BY_KEY = new Map();
SEED_ACTIVE.forEach((r) => COUNTRY_BY_KEY.set(normalizeDestination(r.name), r.country));
INACTIVE_NAMES.forEach((n) => { const k = normalizeDestination(n); if (!COUNTRY_BY_KEY.has(k)) COUNTRY_BY_KEY.set(k, /vra/.test(k) ? "Bulgaria" : "North Macedonia"); });

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

async function resolveCompanies() {
  if (companyArg) {
    const c = await prisma.company.findUnique({ where: { id: companyArg }, select: { id: true, name: true, eik: true } });
    return c ? [c] : [];
  }
  const enabled = await prisma.companyModuleAccess.findMany({ where: { moduleKey: "logistics", enabled: true }, select: { companyId: true } });
  const ids = enabled.map((e) => e.companyId);
  return prisma.company.findMany({ where: { id: { in: ids } }, select: { id: true, name: true, eik: true } });
}

async function planForCompany(company) {
  const companyId = company.id;
  const existing = await prisma.logisticsDestination.findMany({ where: { companyId }, select: { id: true, name: true, normalizedName: true, active: true, address: true } });
  const byKey = new Map(existing.map((d) => [d.normalizedName, d]));

  const [usedSets, routes, shipments] = await Promise.all([
    prisma.exportDocumentSet.findMany({ where: { companyId, destination: { not: null } }, select: { destination: true }, distinct: ["destination"] }),
    prisma.logisticsRoute.findMany({ where: { companyId }, select: { toPlace: true, note: true } }),
    prisma.shipment.findMany({ where: { companyId, destination: { not: null } }, select: { destination: true }, distinct: ["destination"] }),
  ]);

  // Източник за всеки нормализиран ключ (за audit).
  const sources = new Map(); // key -> Set(source labels)
  const rawByKey = new Map(); // key -> display name (first seen, cleaned)
  const addSource = (raw, label) => {
    const display = stripDeliveryTermSuffix(raw); const key = normalizeDestination(display);
    if (!key) return;
    if (!rawByKey.has(key)) rawByKey.set(key, display);
    if (!sources.has(key)) sources.set(key, new Set());
    sources.get(key).add(label);
  };
  SEED_ACTIVE.forEach((r) => addSource(r.name, "SEED"));
  INACTIVE_NAMES.forEach((r) => addSource(r, "SEED(inactive)"));
  MK_DESTINATIONS.forEach((r) => addSource(r, "MK_DESTINATIONS"));
  SEED_DESTINATIONS.forEach((r) => addSource(r, "seed(cyr)"));
  usedSets.forEach((s) => addSource(s.destination, "ExportDocumentSet"));
  routes.forEach((r) => addSource(r.toPlace, "LogisticsRoute"));
  shipments.forEach((s) => addSource(s.destination, "Shipment"));

  // Предпочети „хубаво" display име за ключа (SEED_ACTIVE > друго). За Skopie → „Skopie".
  const seedNameByKey = new Map();
  SEED_ACTIVE.forEach((r) => seedNameByKey.set(normalizeDestination(r.name), r.name));
  INACTIVE_NAMES.forEach((n) => { const k = normalizeDestination(n); if (!seedNameByKey.has(k)) seedNameByKey.set(k, n); });

  const rows = [];
  for (const [key, srcSet] of sources) {
    const inactive = INACTIVE_KEYS.has(key);
    const ex = byKey.get(key);
    const proposedName = seedNameByKey.get(key) || rawByKey.get(key);
    let action = "none";
    if (!ex) action = "CREATE";
    else if (inactive && ex.active) action = "DEACTIVATE";
    else if (key === "skopie" && ex.name !== "Skopie") action = "RENAME→Skopie";
    rows.push({
      key,
      oldName: ex ? ex.name : "(none)",
      proposedName,
      status: inactive ? "INACTIVE" : "ACTIVE",
      address: ex?.address || "MISSING",
      sources: [...srcSet].join(", "),
      action,
    });
  }
  rows.sort((a, b) => (a.status === b.status ? a.proposedName.localeCompare(b.proposedName) : a.status === "ACTIVE" ? -1 : 1));

  // Backfill план: export sets без destinationId, чийто ключ ще има master.
  const willHaveKeys = new Set([...rows.map((r) => r.key), ...existing.map((d) => d.normalizedName)]);
  const unlinked = await prisma.exportDocumentSet.findMany({ where: { companyId, destinationId: null, destination: { not: null } }, select: { id: true, destination: true } });
  let backfillable = 0;
  for (const s of unlinked) { if (willHaveKeys.has(normalizeDestination(stripDeliveryTermSuffix(s.destination)))) backfillable++; }

  return { company, rows, backfillable, existingCount: existing.length };
}

async function applyForCompany(company, plan) {
  const companyId = company.id;
  let created = 0, deactivated = 0, renamed = 0, backfilled = 0;
  for (const r of plan.rows) {
    const inactive = r.status === "INACTIVE";
    if (r.action === "CREATE") {
      await prisma.logisticsDestination.create({ data: { companyId, name: r.proposedName, normalizedName: r.key, country: COUNTRY_BY_KEY.get(r.key) ?? null, active: !inactive } });
      created++;
    } else if (r.action === "DEACTIVATE") {
      const ex = await prisma.logisticsDestination.findUnique({ where: { companyId_normalizedName: { companyId, normalizedName: r.key } }, select: { id: true } });
      if (ex) { await prisma.logisticsDestination.update({ where: { id: ex.id }, data: { active: false } }); deactivated++; }
    } else if (r.action === "RENAME→Skopie") {
      const ex = await prisma.logisticsDestination.findUnique({ where: { companyId_normalizedName: { companyId, normalizedName: r.key } }, select: { id: true } });
      if (ex) { await prisma.logisticsDestination.update({ where: { id: ex.id }, data: { name: "Skopie" } }); renamed++; }
    }
  }
  // Backfill destinationId (snapshot низът остава непроменен).
  const master = await prisma.logisticsDestination.findMany({ where: { companyId }, select: { id: true, normalizedName: true } });
  const idByKey = new Map(master.map((m) => [m.normalizedName, m.id]));
  const unlinked = await prisma.exportDocumentSet.findMany({ where: { companyId, destinationId: null, destination: { not: null } }, select: { id: true, destination: true } });
  for (const s of unlinked) {
    const id = idByKey.get(normalizeDestination(stripDeliveryTermSuffix(s.destination)));
    if (id) { await prisma.exportDocumentSet.update({ where: { id: s.id }, data: { destinationId: id } }); backfilled++; }
  }
  return { created, deactivated, renamed, backfilled };
}

function printPlan(plan) {
  const { company, rows, backfillable, existingCount } = plan;
  console.log(`\n=== [${company.name}] (eik=${company.eik ?? "—"}) — master сега: ${existingCount} записа ===`);
  console.log("Proposed name       | Status   | Address  | Action         | Old name       | Sources");
  console.log("-".repeat(120));
  for (const r of rows) {
    console.log(
      r.proposedName.padEnd(20).slice(0, 20) + "| " +
      r.status.padEnd(9) + "| " +
      (r.address === "MISSING" ? "MISSING " : "present ") + "| " +
      r.action.padEnd(15) + "| " +
      r.oldName.padEnd(15).slice(0, 15) + "| " +
      r.sources,
    );
  }
  const creates = rows.filter((r) => r.action === "CREATE").length;
  const deacts = rows.filter((r) => r.action === "DEACTIVATE").length;
  const renames = rows.filter((r) => r.action.startsWith("RENAME")).length;
  console.log(`\nОбобщение: CREATE=${creates}, DEACTIVATE=${deacts}, RENAME=${renames}, backfill destinationId≈${backfillable}`);
  const missing = rows.filter((r) => r.address === "MISSING").map((r) => r.proposedName);
  if (missing.length) console.log(`Адрес MISSING (НЕ се измисля): ${missing.join(", ")}`);
}

async function main() {
  console.log(APPLY ? "*** APPLY MODE — ще записва в DB ***" : "DRY-RUN (само чете; ползвай --apply за запис)");
  const companies = await resolveCompanies();
  if (companies.length === 0) { console.log("Няма фирми за обработка (провери --company-id или logistics модула)."); return; }
  console.log(`Целеви фирми: ${companies.map((c) => c.name).join(", ")}`);
  for (const c of companies) {
    const plan = await planForCompany(c);
    printPlan(plan);
    if (APPLY) {
      const res = await applyForCompany(c, plan);
      console.log(`APPLIED [${c.name}]:`, res);
    }
  }
  console.log(APPLY ? "\nГотово (APPLY)." : "\nГотово (DRY-RUN). Нищо не е записано.");
}

main().catch((e) => { console.error("ГРЕШКА:", e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
