#!/usr/bin/env node
/**
 * Recovery / backfill на LogisticsDestination master data (regression след PR #213).
 *
 * БЕЗОПАСНОСТ:
 *   - По подразбиране DRY-RUN (само чете и печата). Записва САМО с --apply.
 *   - НИКОГА не трие. НИКОГА не пипа finalized document snapshots (само destinationId relation).
 *   - НЕ измисля адреси: ако адрес липсва в старите данни → nullable + маркиран MISSING.
 *   - Company-scoped: обработва само фирмите, които СЪЗДАВАТ експортни доставки (продавачи,
 *     logisticsExportCreate!==false) ИЛИ подадената --company-id. Купувачите (SEM) се пропускат.
 *   - Alias варианти (кирилица/латиница) се сливат в ЕДИН canonical запис — без duplicates.
 *
 * Употреба:
 *   node scripts/recover-logistics-destinations.mjs                 # dry-run, всички seller фирми
 *   node scripts/recover-logistics-destinations.mjs --company-id=... # dry-run за една фирма
 *   node scripts/recover-logistics-destinations.mjs --apply          # APPLY (запис в DB)
 */
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

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

// ── Canonical дестинации + доказани aliases (огледало на src/lib/logistics/destinations.ts) ──
const CANONICAL = [
  { name:"Skopie", country:"North Macedonia", active:true, aliases:["Skopje","Скопие","Скопjе","FCA SKOPIE","FCA СКОПИЕ"] },
  { name:"Kumanovo", country:"North Macedonia", active:true, aliases:["Куманово","FCA КУМАНОВО"] },
  { name:"Strumica", country:"North Macedonia", active:true, aliases:["Струмица"] },
  { name:"Vinica", country:"North Macedonia", active:true, aliases:["Виница"] },
  { name:"Tetovo", country:"North Macedonia", active:true, aliases:["Тетово"] },
  { name:"Kriva Palanka", country:"North Macedonia", active:true, aliases:["Кр. Паланка","Кр.Паланка","Крива Паланка","FCA КР.ПАЛАНКА","Kr. Palanka"] },
  { name:"Shtip", country:"North Macedonia", active:true, aliases:["Штип","Stip"] },
  { name:"Kochani", country:"North Macedonia", active:true, aliases:["Кочани","FCA КОЧАНИ"] },
  { name:"Rankovce", country:"North Macedonia", active:true, aliases:["Ранковце","FCA РАНКОВЦЕ"] },
  { name:"Batinci", country:"North Macedonia", active:false, aliases:["Батинци"] },
  { name:"Butel", country:"North Macedonia", active:false, aliases:["Бутел"] },
  { name:"Dolno Konjari", country:"North Macedonia", active:false, aliases:["Долно Коњари","Долно Конјари","Dolno Konjare"] },
  { name:"Gostivar", country:"North Macedonia", active:false, aliases:["Гостивар"] },
  { name:"Jakimovo", country:"North Macedonia", active:false, aliases:["Јакимово","Якимово"] },
  { name:"Lipkovo", country:"North Macedonia", active:false, aliases:["Липково"] },
  { name:"Nikushtak", country:"North Macedonia", active:false, aliases:["Никуштак","Nikustak"] },
  { name:"Orizari", country:"North Macedonia", active:false, aliases:["Оризари"] },
  { name:"Petrovec", country:"North Macedonia", active:false, aliases:["Petrovac","Петровец","Петровац"] },
  { name:"Rzanicino", country:"North Macedonia", active:false, aliases:["Ржаничино","Рзаничино","Ržaničino"] },
  { name:"Vizbegovo", country:"North Macedonia", active:false, aliases:["Визбегово"] },
  { name:"Vraca", country:"Bulgaria", active:false, aliases:["Vratsa","Враца"] },
];
const ALIAS_TO_CANONICAL = new Map();
for (const c of CANONICAL) for (const v of [c.name, ...c.aliases]) { const k = normalizeDestination(stripDeliveryTermSuffix(v)); if (k) ALIAS_TO_CANONICAL.set(k, c.name); }
const COUNTRY_BY_KEY = new Map(CANONICAL.map((c) => [normalizeDestination(c.name), c.country]));
const ACTIVE_BY_KEY = new Map(CANONICAL.map((c) => [normalizeDestination(c.name), c.active]));
const INACTIVE_KEYS = new Set(CANONICAL.filter((c) => !c.active).map((c) => normalizeDestination(c.name)));
const MK_DESTINATIONS = ["SKOPIE","PETROVEC","GOSTIVAR","KUMANOVO","STRUMICA","VINICA","TETOVO","KRIVA PALANKA","SHTIP","LIPKOVO","KOCHANI","DOLNO KONJARI","RZANICINO","BATINCI","JAKIMOVO","NIKUSHTAK","ORIZARI","VIZBEGOVO","BUTEL"];
const SEED_DESTINATIONS = ["Скопие","Кочани","Ранковце","Кр. Паланка","Куманово"];

function canonicalDestination(raw) {
  const cleaned = stripDeliveryTermSuffix(raw);
  const vkey = normalizeDestination(cleaned);
  const name = ALIAS_TO_CANONICAL.get(vkey) ?? cleaned;
  return { name, key: normalizeDestination(name) };
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

async function resolveCompanies() {
  if (companyArg) {
    const c = await prisma.company.findUnique({ where: { id: companyArg }, select: { id: true, name: true, eik: true, logisticsExportCreate: true } });
    return c ? [c] : [];
  }
  const enabled = await prisma.companyModuleAccess.findMany({ where: { moduleKey: "logistics", enabled: true }, select: { companyId: true } });
  const companies = await prisma.company.findMany({ where: { id: { in: enabled.map((e) => e.companyId) } }, select: { id: true, name: true, eik: true, logisticsExportCreate: true } });
  // §2/§10: само продавачите (създатели на export). Купувачите (SEM) се пропускат.
  return companies.filter((c) => c.logisticsExportCreate !== false);
}

async function planForCompany(company) {
  const companyId = company.id;
  const existing = await prisma.logisticsDestination.findMany({ where: { companyId }, select: { id: true, name: true, normalizedName: true, active: true, address: true } });
  const byKey = new Map(existing.map((d) => [d.normalizedName, d]));

  const [usedSets, routes, shipments] = await Promise.all([
    prisma.exportDocumentSet.findMany({ where: { companyId, destination: { not: null } }, select: { destination: true }, distinct: ["destination"] }),
    prisma.logisticsRoute.findMany({ where: { companyId }, select: { toPlace: true } }),
    prisma.shipment.findMany({ where: { companyId, destination: { not: null } }, select: { destination: true }, distinct: ["destination"] }),
  ]);
  // Историческа употреба (брой export sets) по canonical ключ.
  const usageByKey = new Map();
  const usageRows = await prisma.exportDocumentSet.findMany({ where: { companyId, destination: { not: null } }, select: { destination: true } });
  for (const r of usageRows) { const k = canonicalDestination(r.destination).key; if (k) usageByKey.set(k, (usageByKey.get(k) ?? 0) + 1); }

  // Събиране по canonical ключ: сорс етикети + намерени alias raw стойности.
  const sources = new Map();   // key -> Set(source labels)
  const aliasesRaw = new Map(); // key -> Set(raw variant strings actually seen)
  const add = (raw, label, isRealData) => {
    const { key } = canonicalDestination(raw);
    if (!key) return;
    if (!sources.has(key)) { sources.set(key, new Set()); aliasesRaw.set(key, new Set()); }
    sources.get(key).add(label);
    if (isRealData) aliasesRaw.get(key).add(String(raw).trim());
  };
  CANONICAL.forEach((c) => add(c.name, "SEED", false));
  MK_DESTINATIONS.forEach((r) => add(r, "MK_DESTINATIONS", false));
  SEED_DESTINATIONS.forEach((r) => add(r, "seed(cyr)", false));
  usedSets.forEach((s) => add(s.destination, "ExportDocumentSet", true));
  routes.forEach((r) => add(r.toPlace, "LogisticsRoute", true));
  shipments.forEach((s) => add(s.destination, "Shipment", true));

  const rows = [];
  for (const [key, srcSet] of sources) {
    const canonName = ALIAS_TO_CANONICAL.get(key) ?? [...aliasesRaw.get(key)][0] ?? key;
    const inactive = INACTIVE_KEYS.has(key);
    const ex = byKey.get(key);
    let action = "none";
    if (!ex) action = "CREATE";
    else if (inactive && ex.active) action = "DEACTIVATE";
    else if (ALIAS_TO_CANONICAL.get(key) && ex.name !== canonName) action = `RENAME→${canonName}`;
    rows.push({
      canonical: canonName,
      aliases: [...aliasesRaw.get(key)].filter((a) => a !== canonName).join(", ") || "—",
      status: inactive ? "INACTIVE" : "ACTIVE",
      address: ex?.address || "MISSING",
      addressSource: ex?.address ? "existing master" : "none (not invented)",
      uses: usageByKey.get(key) ?? 0,
      owner: company.name,
      action,
    });
  }
  rows.sort((a, b) => (a.status === b.status ? a.canonical.localeCompare(b.canonical) : a.status === "ACTIVE" ? -1 : 1));

  const willHave = new Set([...rows.map((r) => r.canonical).map((n) => normalizeDestination(n)), ...existing.map((d) => d.normalizedName)]);
  const unlinked = await prisma.exportDocumentSet.findMany({ where: { companyId, destinationId: null, destination: { not: null } }, select: { id: true, destination: true } });
  let backfillable = 0;
  for (const s of unlinked) if (willHave.has(canonicalDestination(s.destination).key)) backfillable++;

  return { company, rows, backfillable, existingCount: existing.length };
}

async function applyForCompany(company, plan) {
  const companyId = company.id;
  let created = 0, deactivated = 0, renamed = 0, backfilled = 0;
  for (const r of plan.rows) {
    const key = normalizeDestination(r.canonical);
    const inactive = r.status === "INACTIVE";
    if (r.action === "CREATE") {
      await prisma.logisticsDestination.create({ data: { companyId, name: r.canonical, normalizedName: key, country: COUNTRY_BY_KEY.get(key) ?? null, active: !inactive } });
      created++;
    } else if (r.action === "DEACTIVATE") {
      const ex = await prisma.logisticsDestination.findUnique({ where: { companyId_normalizedName: { companyId, normalizedName: key } }, select: { id: true } });
      if (ex) { await prisma.logisticsDestination.update({ where: { id: ex.id }, data: { active: false } }); deactivated++; }
    } else if (r.action.startsWith("RENAME")) {
      const ex = await prisma.logisticsDestination.findUnique({ where: { companyId_normalizedName: { companyId, normalizedName: key } }, select: { id: true } });
      if (ex) { await prisma.logisticsDestination.update({ where: { id: ex.id }, data: { name: r.canonical } }); renamed++; }
    }
  }
  const master = await prisma.logisticsDestination.findMany({ where: { companyId }, select: { id: true, normalizedName: true } });
  const idByKey = new Map(master.map((m) => [m.normalizedName, m.id]));
  const unlinked = await prisma.exportDocumentSet.findMany({ where: { companyId, destinationId: null, destination: { not: null } }, select: { id: true, destination: true } });
  for (const s of unlinked) {
    const id = idByKey.get(canonicalDestination(s.destination).key);
    if (id) { await prisma.exportDocumentSet.update({ where: { id: s.id }, data: { destinationId: id } }); backfilled++; }
  }
  return { created, deactivated, renamed, backfilled };
}

function printPlan(plan) {
  const { company, rows, backfillable, existingCount } = plan;
  console.log(`\n=== [${company.name}] (eik=${company.eik ?? "—"}) — master сега: ${existingCount} записа ===`);
  console.log("Canonical destination | Status   | Address  | Addr source          | Uses | Action        | Aliases found");
  console.log("-".repeat(130));
  for (const r of rows) {
    console.log(
      r.canonical.padEnd(22).slice(0, 22) + "| " +
      r.status.padEnd(9) + "| " +
      (r.address === "MISSING" ? "MISSING " : "present ") + "| " +
      r.addressSource.padEnd(21).slice(0, 21) + "| " +
      String(r.uses).padEnd(5) + "| " +
      r.action.padEnd(14) + "| " +
      r.aliases,
    );
  }
  const creates = rows.filter((r) => r.action === "CREATE").length;
  const deacts = rows.filter((r) => r.action === "DEACTIVATE").length;
  const renames = rows.filter((r) => r.action.startsWith("RENAME")).length;
  console.log(`\nОбобщение [${company.name}]: CREATE=${creates}, DEACTIVATE=${deacts}, RENAME=${renames}, backfill destinationId≈${backfillable}`);
  const missing = rows.filter((r) => r.address === "MISSING").map((r) => r.canonical);
  if (missing.length) console.log(`Адрес MISSING (НЕ се измисля): ${missing.join(", ")}`);
}

async function main() {
  console.log(APPLY ? "*** APPLY MODE — ще записва в DB ***" : "DRY-RUN (само чете; ползвай --apply за запис)");
  const companies = await resolveCompanies();
  if (companies.length === 0) { console.log("Няма seller фирми за обработка (провери --company-id или logistics модула / logisticsExportCreate)."); return; }
  console.log(`Целеви seller фирми: ${companies.map((c) => c.name).join(", ")}`);
  for (const c of companies) {
    const plan = await planForCompany(c);
    printPlan(plan);
    if (APPLY) { const res = await applyForCompany(c, plan); console.log(`APPLIED [${c.name}]:`, res); }
  }
  console.log(APPLY ? "\nГотово (APPLY)." : "\nГотово (DRY-RUN). Нищо не е записано.");
}

main().catch((e) => { console.error("ГРЕШКА:", e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
