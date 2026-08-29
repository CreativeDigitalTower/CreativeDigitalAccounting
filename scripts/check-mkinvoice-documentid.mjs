// READ-ONLY проверка преди `prisma db push` на unique индекса MkInvoice.documentId.
// Не пише нищо в базата. Ползва текущия DATABASE_URL/Prisma adapter на проекта —
// не изисква ръчно въвеждане на credentials.
//
// Употреба (на сървъра, от root-а на проекта):
//   node scripts/check-mkinvoice-documentid.mjs
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  // 1) Общ брой MkInvoice.
  const total = await prisma.mkInvoice.count();
  // 2) Брой с попълнен documentId (не NULL).
  const withDoc = await prisma.mkInvoice.count({ where: { documentId: { not: null } } });

  // 3+4) Дубликати по non-null documentId (raw SQL — точна проверка на това, което
  // unique индексът ще наложи). NULL стойностите се игнорират (Postgres допуска много
  // NULL под UNIQUE), затова тук се броят само реалните колизии.
  const dups = await prisma.$queryRaw`
    SELECT "documentId", COUNT(*)::int AS cnt, array_agg("id") AS mkinvoice_ids
    FROM "MkInvoice"
    WHERE "documentId" IS NOT NULL
    GROUP BY "documentId"
    HAVING COUNT(*) > 1
    ORDER BY cnt DESC
  `;

  console.log("── MkInvoice.documentId pre-flight check ──");
  console.log(`1) MkInvoice records total:            ${total}`);
  console.log(`2) with non-null documentId:           ${withDoc}`);
  console.log(`3) duplicate non-null documentId groups: ${dups.length}`);
  if (dups.length === 0) {
    console.log("\n✅ NO DUPLICATES. Безопасно е да пуснете отново `prisma db push` и да отговорите `y`.");
    console.log("   (Unique индексът върху documentId няма да фейлне.)");
  } else {
    console.log("\n⚠️  DUPLICATES FOUND — НЕ пускайте `db push` с `y` още. Детайли:");
    for (const d of dups) {
      console.log(`   documentId=${d.documentId}  count=${d.cnt}  MkInvoice ids=[${d.mkinvoice_ids.join(", ")}]`);
    }
    console.log("\nНищо не е променяно. Изпратете този изход за backfill/fix план.");
  }
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
