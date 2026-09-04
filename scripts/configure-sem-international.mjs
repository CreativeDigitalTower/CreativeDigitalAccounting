// Конфигурира фирма SEM INTERNATIONAL DOOEL (MK получателят) в production.
//   - logisticsExportCreate = false  → SEM НЕ може да създава експортни доставки (§1/§9)
//   - defaultCurrency = MKD, defaultVatRate = 18, vatRegistered = true, defaultVatExempt = false
//     (SEM defaults за нови MK фактури — от предишната задача; „Не начислявай ДДС" остава ръчна опция)
//
// ЕДИНСТВЕН source of truth за export-create е Company.logisticsExportCreate (§11) — този скрипт
// само задава стойността на правилния запис. Guard-ът (POST + route + UI) чете същото поле.
//
// СТАБИЛНА ИДЕНТИФИКАЦИЯ (§10) — по приоритет, за да НЕ зависим от точното изписване на името
// (в production може да има OCR разлики: „SEM INIERNAIIONAL JOUEL" и т.н.):
//   1) --id <companyId>            → най-стабилно, задава точно този запис;
//   2) --group <companyGroupId>    → (или авто-единствената логистична група) намира SEM като
//                                     члена на групата, който НЕ е export-продавачът (продавачът =
//                                     фирмата, която притежава ExportDocumentSet записи, т.е.
//                                     METAL TRADE). Едновременно потвърждава/задава продавача = true.
//   3) по име                      → anchor на „SEM" сред активните фирми; ако match е 0 или >1 → спира.
//
// БЕЗОПАСНО + idempotent: dry-run по подразбиране; --apply записва; --check само отпечатва
// състоянието на групата. НЕ пипа издадени документи (§8/§14). Засяга само SEM (+ продавача в
// group mode); другите фирми остават непроменени (§12). След --apply ВЕРИФИЦИРА резултата и
// излиза с код 1, ако logisticsExportCreate на SEM не е false.
//
// Стартиране (зарежда .env → DATABASE_URL, за да няма SCRAM/undefined-password грешка):
//   проверка: node --env-file=.env scripts/configure-sem-international.mjs --check
//   dry-run:  node --env-file=.env scripts/configure-sem-international.mjs
//   apply:    node --env-file=.env scripts/configure-sem-international.mjs --apply
//   изрично:  node --env-file=.env scripts/configure-sem-international.mjs --apply --id <companyId>
//   по група: node --env-file=.env scripts/configure-sem-international.mjs --apply --group <companyGroupId>
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL липсва. Стартирайте с: node --env-file=.env scripts/configure-sem-international.mjs");
  process.exit(1);
}
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const APPLY = process.argv.includes("--apply");
const CHECK = process.argv.includes("--check");
const arg = (flag) => { const i = process.argv.indexOf(flag); return i >= 0 ? process.argv[i + 1] : null; };
const idArg = arg("--id");
const groupArg = arg("--group");

const SELECT = { id: true, name: true, companyGroupId: true, country: true, defaultCurrency: true, defaultVatRate: true, logisticsExportCreate: true, vatRegistered: true, defaultVatExempt: true };
// SEM target: не може да създава експорти + MK defaults (§1 + предишна задача).
const SEM_TARGET = { logisticsExportCreate: false, defaultCurrency: "MKD", defaultVatRate: 18, vatRegistered: true, defaultVatExempt: false };
const LOGISTICS_MODULE_KEY = "logistics";

/** Фирмите с активиран логистичен модул (database-driven, без hardcode на ЕИК). */
async function logisticsCompanyIds() {
  const rows = await prisma.companyModuleAccess.findMany({ where: { moduleKey: LOGISTICS_MODULE_KEY, enabled: true }, select: { companyId: true } });
  return new Set(rows.map((r) => r.companyId));
}

/** Продавачът в групата = фирмата, която притежава ExportDocumentSet записи (издава експорти). */
async function exportSellerId(companyIds) {
  const grouped = await prisma.exportDocumentSet.groupBy({ by: ["companyId"], where: { companyId: { in: companyIds } }, _count: { _all: true } });
  if (grouped.length === 0) return null;
  grouped.sort((a, b) => b._count._all - a._count._all);
  return grouped[0].companyId;
}

/** Разрешава SEM (buyer) по стабилен идентификатор (§10). Връща { company, seller? }. */
async function resolveSem() {
  if (idArg) {
    const company = await prisma.company.findUnique({ where: { id: idArg }, select: SELECT });
    if (!company) { console.error(`Няма фирма с id=${idArg}.`); process.exit(1); }
    return { company, seller: null };
  }

  // Group mode: изрично подадена група или авто-единствената логистична група.
  const logiIds = await logisticsCompanyIds();
  let groupId = groupArg;
  if (!groupId) {
    const groups = await prisma.company.findMany({
      where: { id: { in: [...logiIds] }, companyGroupId: { not: null }, archivedAt: null },
      select: { companyGroupId: true },
    });
    const uniq = [...new Set(groups.map((g) => g.companyGroupId))];
    if (uniq.length === 1) groupId = uniq[0];
  }
  if (groupId) {
    const members = await prisma.company.findMany({ where: { companyGroupId: groupId, archivedAt: null }, select: SELECT });
    const logiMembers = members.filter((m) => logiIds.has(m.id));
    const pool = logiMembers.length ? logiMembers : members;
    const sellerId = await exportSellerId(pool.map((m) => m.id));
    // Buyer(и) = членове, различни от продавача. Ако продавачът е неизвестен (няма още
    // експорти), продавачът е BG фирмата (country=България), а SEM е не-BG членът.
    const seller = sellerId ? pool.find((m) => m.id === sellerId) : pool.find((m) => (m.country ?? "").toLowerCase().includes("българ"));
    const buyers = pool.filter((m) => m.id !== seller?.id);
    if (buyers.length === 1) return { company: buyers[0], seller: seller ?? null };
    console.error(`Групата ${groupId} има ${buyers.length} не-продавач фирми — подайте изрично --id <companyId>:`, buyers.map((b) => `${b.id} (${b.name})`).join(", "));
    process.exit(1);
  }

  // Name fallback — anchor на „SEM" (толерира OCR разлики в останалата част от името).
  const all = await prisma.company.findMany({ where: { archivedAt: null }, select: SELECT });
  const norm = (s) => (s ?? "").trim().toUpperCase();
  const matches = all.filter((c) => /^SEM\b/.test(norm(c.name)));
  if (matches.length === 0) { console.error("Не е намерена фирма, започваща със SEM. Подайте --id <companyId> или --group <companyGroupId>."); process.exit(1); }
  if (matches.length > 1) { console.error("Няколко фирми започват със SEM — подайте изрично --id:", matches.map((m) => `${m.id} (${m.name})`).join(", ")); process.exit(1); }
  return { company: matches[0], seller: null };
}

async function runCheck() {
  const logiIds = await logisticsCompanyIds();
  const companies = await prisma.company.findMany({ where: { id: { in: [...logiIds] }, archivedAt: null }, select: SELECT, orderBy: { name: "asc" } });
  const sellerId = await exportSellerId([...logiIds]);
  console.log("\n--check — логистични фирми и право за създаване на експортни доставки:\n");
  for (const c of companies) {
    const canCreate = c.logisticsExportCreate !== false; // огледало на isExportCreateAllowed
    console.log(`  ${canCreate ? "✔ МОЖЕ  " : "✖ НЕ МОЖЕ"}  ${c.name}  (${c.id})  logisticsExportCreate=${c.logisticsExportCreate}${c.id === sellerId ? "  [export seller]" : ""}`);
  }
  console.log("\nПравило: само продавачът (METAL TRADE) трябва да е ✔; SEM трябва да е ✖.");
}

async function main() {
  if (CHECK) { await runCheck(); return; }

  const { company, seller } = await resolveSem();
  console.log(`\n${APPLY ? "APPLY" : "DRY-RUN"} — SEM INTERNATIONAL configuration`);
  console.log(`  Company (buyer): ${company.name} (${company.id})`);
  if (seller) console.log(`  Export seller:   ${seller.name} (${seller.id})  logisticsExportCreate=${seller.logisticsExportCreate}`);
  console.log(`  logisticsExportCreate: ${company.logisticsExportCreate}  →  ${SEM_TARGET.logisticsExportCreate}`);
  console.log(`  defaultCurrency:       ${company.defaultCurrency}  →  ${SEM_TARGET.defaultCurrency}`);
  console.log(`  defaultVatRate:        ${company.defaultVatRate ?? "—"}  →  ${SEM_TARGET.defaultVatRate}`);
  console.log(`  vatRegistered:         ${company.vatRegistered}  →  ${SEM_TARGET.vatRegistered}`);
  console.log(`  defaultVatExempt:      ${company.defaultVatExempt}  →  ${SEM_TARGET.defaultVatExempt}`);

  if (seller && seller.logisticsExportCreate === false) {
    console.log(`\n⚠ Внимание: продавачът ${seller.name} е с logisticsExportCreate=false. В group mode ще бъде върнат на true, за да може да създава експорти (§8).`);
  }

  if (!APPLY) { console.log("\nНищо не е променяно. Пуснете с --apply за реално прилагане."); return; }

  await prisma.$transaction(async (tx) => {
    await tx.company.update({ where: { id: company.id }, data: SEM_TARGET });
    // §8: продавачът трябва да МОЖЕ да създава. В group mode гарантираме true (idempotent).
    if (seller && seller.logisticsExportCreate === false) {
      await tx.company.update({ where: { id: seller.id }, data: { logisticsExportCreate: true } });
    }
  });

  // ВЕРИФИКАЦИЯ (§14): пре-четем и потвърждаваме, че SEM вече НЕ може да създава.
  const after = await prisma.company.findUnique({ where: { id: company.id }, select: { logisticsExportCreate: true } });
  if (after?.logisticsExportCreate !== false) {
    console.error("\n✗ ГРЕШКА: след запис logisticsExportCreate не е false. Проверете DB миграцията (db push).");
    process.exit(1);
  }
  console.log("\n✓ Приложено и верифицирано: SEM НЕ може да създава експортни доставки. Издадените документи НЕ са променяни.");
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
