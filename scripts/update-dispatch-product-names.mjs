// Попълва LogisticsProduct.dispatchName („Име за Испратница") за 6-те canonical цимента на
// МЕТАЛ ТРЕЙД КЮСТЕНДИЛ 2005 ООД (ЕИК 109581515). Само това поле — не пипа canonicalName,
// сертификат, цена, категория, alias-и. Idempotent, dry-run по подразбиране.
//
// Match: нормализирано canonical име (+ alias), еднозначно. Ambiguous/липса → SKIP (не гадае).
// НЕ създава продукти.
//
//   dry-run: node --env-file=.env scripts/update-dispatch-product-names.mjs --eik 109581515
//   apply:   node --env-file=.env scripts/update-dispatch-product-names.mjs --eik 109581515 --apply
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

if (!process.env.DATABASE_URL) { console.error("DATABASE_URL липсва. node --env-file=.env scripts/update-dispatch-product-names.mjs ..."); process.exit(1); }
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

const APPLY = process.argv.includes("--apply");
const arg = (f) => { const i = process.argv.indexOf(f); return i >= 0 ? process.argv[i + 1] : null; };

// Идентична нормализация с normalizeProductKey (без foldCyrillic — имената тук са латиница).
const norm = (s) => (s ?? "").toUpperCase().replace(/,/g, ".").replace(/\s+/g, "").replace(/\//g, "").replace(/-/g, "");

const BULK = (grade) => `цемент ${grade}, HOLCIM - рефуз`;
const PACKAGED = "Цемент - 17 ПАЛЕТИ, 952 ВРЕКИ х 25КГ";
const TARGETS = [
  { name: "CEM II A-LL 42.5 R", dispatchName: BULK("CEM II A-LL 42.5 R") },
  { name: "CEM II A-LL 52.5 N", dispatchName: BULK("CEM II A-LL 52.5 N") },
  { name: "CEM II B-V 52.5 N", dispatchName: BULK("CEM II B-V 52.5 N") },
  { name: "CEM II B-LL 32.5 R", dispatchName: PACKAGED },
  { name: "CEM II B-LL 42.5 R", dispatchName: PACKAGED },
  { name: "CEM II C-M (V-LL) 42.5 N", dispatchName: PACKAGED },
];

async function resolveCompany() {
  const id = arg("--company-id"), eik = arg("--eik");
  if (id) { const c = await prisma.company.findUnique({ where: { id }, select: { id: true, name: true, eik: true } }); if (!c) { console.error("Няма фирма с това id."); process.exit(1); } return c; }
  if (eik) { const l = await prisma.company.findMany({ where: { eik }, select: { id: true, name: true, eik: true } }); if (l.length !== 1) { console.error(`Очаквах 1 фирма с ЕИК=${eik}, намерени ${l.length}.`); process.exit(1); } return l[0]; }
  const l = await prisma.company.findMany({ where: { OR: [{ name: { contains: "МЕТАЛ ТРЕЙД", mode: "insensitive" } }, { name: { contains: "METAL TRADE", mode: "insensitive" } }] }, select: { id: true, name: true, eik: true } });
  if (l.length !== 1) { console.error(`Име „Метал Трейд" даде ${l.length} съвпадения — подайте --company-id или --eik.`); process.exit(1); }
  return l[0];
}

async function main() {
  const company = await resolveCompany();
  const products = await prisma.logisticsProduct.findMany({ where: { companyId: company.id }, select: { id: true, canonicalName: true, dispatchName: true, aliases: { select: { alias: true } } } });
  console.log(`\n${APPLY ? "APPLY" : "DRY-RUN"} — dispatch product names`);
  console.log(`  Company: ${company.name} (${company.id}, ЕИК ${company.eik}) — продукти: ${products.length}\n`);

  const summary = { UPDATE: 0, NO_CHANGE: 0, MISSING: 0, AMBIGUOUS: 0 };
  const used = new Set();
  for (const tgt of TARGETS) {
    const key = norm(tgt.name);
    const cands = products.filter((p) => !used.has(p.id) && (norm(p.canonicalName) === key || p.aliases.some((a) => norm(a.alias) === key)));
    if (cands.length === 0) { console.log(`  MISSING   ${tgt.name}`); summary.MISSING++; continue; }
    if (cands.length > 1) { console.log(`  AMBIGUOUS ${tgt.name} — ${cands.map((c) => c.id).join(", ")}`); summary.AMBIGUOUS++; continue; }
    const p = cands[0]; used.add(p.id);
    const action = (p.dispatchName ?? "") === tgt.dispatchName ? "NO_CHANGE" : "UPDATE";
    summary[action]++;
    console.log(`  ${action.padEnd(9)} ${p.canonicalName}`);
    console.log(`            CURRENT: ${p.dispatchName ?? "—"}`);
    console.log(`            TARGET:  ${tgt.dispatchName}`);
    if (APPLY && action === "UPDATE") { await prisma.logisticsProduct.update({ where: { id: p.id }, data: { dispatchName: tgt.dispatchName } }); }
  }

  if (APPLY) {
    const after = await prisma.logisticsProduct.findMany({ where: { companyId: company.id, canonicalName: { in: TARGETS.map((t) => t.name) } }, select: { canonicalName: true, dispatchName: true }, orderBy: { canonicalName: "asc" } });
    console.log("\n✓ Приложено. Актуални имена за Испратница:");
    for (const p of after) console.log(`  ${p.canonicalName}  →  ${p.dispatchName ?? "—"}`);
  }
  console.log(`\nОбобщение: ${JSON.stringify(summary)}`);
  if (!APPLY) console.log("DRY-RUN — нищо не е променяно. Пуснете с --apply.");
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
