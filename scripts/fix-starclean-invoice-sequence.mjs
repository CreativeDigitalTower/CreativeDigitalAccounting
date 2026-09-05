// ЕДНОКРАТНА production data correction — САМО за „Старклийн ФМ ЕООД" (Част Б, §22/§28).
// Задава Company.nextInvoiceNumber = 2700184 → следващата редовна фактура ще бъде 0002700184
// (последната редовна е 0002700183). НЕ докосва други фирми, НЕ променя издадени документи,
// НЕ пипа специалната фактура 0002700175-1.
//
// Идентификация по УНИКАЛЕН идентификатор (§22): --id <companyId> ИЛИ --eik <ЕИК>. Име се
// ползва само като краен fallback и спира при 0 или >1 съвпадения (не гадае).
//
// БЕЗОПАСНО + idempotent: dry-run по подразбиране; --apply записва; верификация след запис.
// Преди запис ПРОВЕРЯВА, че 0002700183 съществува и че 0002700184 е свободен (§17).
//
//   dry-run: node --env-file=.env scripts/fix-starclean-invoice-sequence.mjs --eik <ЕИК>
//   apply:   node --env-file=.env scripts/fix-starclean-invoice-sequence.mjs --eik <ЕИК> --apply
//   по id:   node --env-file=.env scripts/fix-starclean-invoice-sequence.mjs --id <companyId> --apply
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL липсва. Стартирайте с: node --env-file=.env scripts/fix-starclean-invoice-sequence.mjs ...");
  process.exit(1);
}
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

const APPLY = process.argv.includes("--apply");
const arg = (f) => { const i = process.argv.indexOf(f); return i >= 0 ? process.argv[i + 1] : null; };
const idArg = arg("--id");
const eikArg = arg("--eik");

const TARGET_LAST_REGULAR = "0002700183";
const TARGET_NEXT_VALUE = 2700184;      // → 0002700184
const pad10 = (n) => String(n).padStart(10, "0");
const coreValue = (num) => (/^\d+$/.test(num) ? parseInt(num, 10) : null); // само редовни (§8)

async function resolveCompany() {
  if (idArg) {
    const c = await prisma.company.findUnique({ where: { id: idArg }, select: { id: true, name: true, eik: true, nextInvoiceNumber: true } });
    if (!c) { console.error(`Няма фирма с id=${idArg}.`); process.exit(1); }
    return c;
  }
  if (eikArg) {
    const list = await prisma.company.findMany({ where: { eik: eikArg }, select: { id: true, name: true, eik: true, nextInvoiceNumber: true } });
    if (list.length !== 1) { console.error(`Очаквах точно 1 фирма с ЕИК=${eikArg}, намерени: ${list.length}.`); process.exit(1); }
    return list[0];
  }
  const byName = await prisma.company.findMany({
    where: { OR: [{ name: { contains: "СТАРКЛИЙН", mode: "insensitive" } }, { name: { contains: "STARCLEAN", mode: "insensitive" } }] },
    select: { id: true, name: true, eik: true, nextInvoiceNumber: true },
  });
  if (byName.length !== 1) {
    console.error(`Име „Старклийн" даде ${byName.length} съвпадения — подайте --id <companyId> или --eik <ЕИК>.`, byName.map((c) => `${c.id} (${c.name}, ЕИК ${c.eik})`).join(", "));
    process.exit(1);
  }
  return byName[0];
}

async function main() {
  const company = await resolveCompany();
  const docs = await prisma.document.findMany({ where: { companyId: company.id, type: "invoice" }, select: { number: true } });
  let maxRegular = 0;
  for (const d of docs) { const v = coreValue(d.number); if (v != null && v > maxRegular) maxRegular = v; }
  const has0183 = docs.some((d) => d.number === TARGET_LAST_REGULAR);
  const has0184taken = docs.some((d) => d.number === pad10(TARGET_NEXT_VALUE));

  console.log(`\n${APPLY ? "APPLY" : "DRY-RUN"} — Старклийн ФМ ЕООД invoice sequence correction`);
  console.log(`  Company: ${company.name} (id=${company.id}, ЕИК=${company.eik})`);
  console.log(`  Общо фактури: ${docs.length}`);
  console.log(`  Най-голям РЕДОВЕН номер: ${maxRegular ? pad10(maxRegular) : "—"}`);
  console.log(`  Съществува ${TARGET_LAST_REGULAR}: ${has0183 ? "ДА" : "НЕ"}`);
  console.log(`  nextInvoiceNumber (override): ${company.nextInvoiceNumber ?? "NULL (derived)"}  →  ${TARGET_NEXT_VALUE}`);
  console.log(`  Следваща фактура след корекцията: ${pad10(TARGET_NEXT_VALUE)}`);

  if (!has0183) { console.error(`\n✗ ${TARGET_LAST_REGULAR} НЕ съществува — прекратявам без промяна (проверете фирмата/данните).`); process.exit(1); }
  if (has0184taken) { console.error(`\n✗ ${pad10(TARGET_NEXT_VALUE)} вече съществува — прекратявам (§17).`); process.exit(1); }

  if (!APPLY) { console.log("\nНищо не е променяно. Пуснете с --apply за реално прилагане."); return; }
  await prisma.company.update({ where: { id: company.id }, data: { nextInvoiceNumber: TARGET_NEXT_VALUE } });
  const after = await prisma.company.findUnique({ where: { id: company.id }, select: { nextInvoiceNumber: true } });
  if (after?.nextInvoiceNumber !== TARGET_NEXT_VALUE) { console.error("\n✗ ГРЕШКА: стойността не е записана коректно."); process.exit(1); }
  console.log(`\n✓ Приложено и верифицирано: следващата редовна фактура ще бъде ${pad10(TARGET_NEXT_VALUE)}. Издадените документи НЕ са променяни.`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
