// Конфигурира фирма SEM INTERNATIONAL DOOEL (MK получателят) в production (§7/§14):
//   - defaultCurrency = MKD (§5)
//   - defaultVatRate  = 18 (§3)
//   - logisticsExportCreate = false (§1 — не може да създава BG експортни доставки)
//   - vatRegistered = true, defaultVatExempt = false (§4/§15 — за да важи 18% ставка
//     по подразбиране при НОВА фактура; иначе нерегистрирана фирма → авто-освобождаване 0%).
//     „Не начислявай ДДС" остава ръчна опция за конкретна фактура (§5).
//
// БЕЗОПАСНО + idempotent:
//   - dry-run по подразбиране (показва текущи → целеви стойности); --apply записва.
//   - засяга ТОЧНО една фирма: по --id <companyId> ИЛИ по име (contains „SEM INTERNATIONAL",
//     case-insensitive). Ако match-ът е 0 или >1 → спира без промяна (не гадае).
//   - НЕ пипа издадени документи (историческите валути/ДДС остават непроменени, §8).
//
// Стартиране (зарежда .env → DATABASE_URL, за да няма SCRAM/undefined-password грешка):
//   dry-run: node --env-file=.env scripts/configure-sem-international.mjs
//   apply:   node --env-file=.env scripts/configure-sem-international.mjs --apply
//   изрично: node --env-file=.env scripts/configure-sem-international.mjs --apply --id <companyId>
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL липсва. Стартирайте с: node --env-file=.env scripts/configure-sem-international.mjs");
  process.exit(1);
}
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const APPLY = process.argv.includes("--apply");
const idArg = (() => { const i = process.argv.indexOf("--id"); return i >= 0 ? process.argv[i + 1] : null; })();

const TARGET = { defaultCurrency: "MKD", defaultVatRate: 18, logisticsExportCreate: false, vatRegistered: true, defaultVatExempt: false };

async function main() {
  let company;
  if (idArg) {
    company = await prisma.company.findUnique({ where: { id: idArg }, select: { id: true, name: true, defaultCurrency: true, defaultVatRate: true, logisticsExportCreate: true, vatRegistered: true, defaultVatExempt: true } });
    if (!company) { console.error(`Няма фирма с id=${idArg}.`); process.exit(1); }
  } else {
    const matches = await prisma.company.findMany({
      where: { name: { contains: "SEM INTERNATIONAL", mode: "insensitive" }, archivedAt: null },
      select: { id: true, name: true, defaultCurrency: true, defaultVatRate: true, logisticsExportCreate: true, vatRegistered: true, defaultVatExempt: true },
    });
    if (matches.length === 0) { console.error("Не е намерена фирма SEM INTERNATIONAL. Подайте --id <companyId>."); process.exit(1); }
    if (matches.length > 1) { console.error("Намерени са няколко фирми — подайте изрично --id:", matches.map((m) => `${m.id} (${m.name})`).join(", ")); process.exit(1); }
    company = matches[0];
  }

  console.log(`\n${APPLY ? "APPLY" : "DRY-RUN"} — SEM INTERNATIONAL configuration`);
  console.log(`  Company: ${company.name} (${company.id})`);
  console.log(`  defaultCurrency:       ${company.defaultCurrency}  →  ${TARGET.defaultCurrency}`);
  console.log(`  defaultVatRate:        ${company.defaultVatRate ?? "—"}  →  ${TARGET.defaultVatRate}`);
  console.log(`  logisticsExportCreate: ${company.logisticsExportCreate}  →  ${TARGET.logisticsExportCreate}`);
  console.log(`  vatRegistered:         ${company.vatRegistered}  →  ${TARGET.vatRegistered}`);
  console.log(`  defaultVatExempt:      ${company.defaultVatExempt}  →  ${TARGET.defaultVatExempt}`);

  if (!APPLY) { console.log("\nНищо не е променяно. Пуснете с --apply за реално прилагане."); return; }
  await prisma.company.update({ where: { id: company.id }, data: TARGET });
  console.log("\n✓ Приложено. Съществуващите документи НЕ са променяни (само фирмените defaults).");
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
