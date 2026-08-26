// Backfill за „Получени доставки" (BG→MK): попълва ExportDocumentSet.buyerCompanyId за
// стари доставки, при които е null, така че да се появят при получаващата (MK) фирма.
//
// БЕЗОПАСНО и idempotent:
//   - Пипа само записи с buyerCompanyId = null (не пренаписва вече свързани).
//   - Свързва купувача САМО когато е еднозначен: групата на продавача има точно една
//     друга фирма. При 0 или >1 други фирми → ambiguous, НЕ пипа (§36).
//   - Не променя друга бизнес логика на историческите доставки (additive relation, §35).
//
// Употреба:
//   node scripts/backfill-received-buyer.mjs           → DRY-RUN (само отчет)
//   node scripts/backfill-received-buyer.mjs --apply   → записва buyerCompanyId
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });
const APPLY = process.argv.includes("--apply");

async function main() {
  const sets = await prisma.exportDocumentSet.findMany({
    where: { buyerCompanyId: null },
    select: { id: true, invoiceNumber: true, companyId: true },
  });

  // Кеш: за фирма → списък с другите фирми в нейната група.
  const groupOf = new Map();      // companyId -> companyGroupId|null
  const othersOf = new Map();     // companyGroupId -> [{id,name}]

  async function otherCompanies(companyId) {
    if (!groupOf.has(companyId)) {
      const c = await prisma.company.findUnique({ where: { id: companyId }, select: { companyGroupId: true } });
      groupOf.set(companyId, c?.companyGroupId ?? null);
    }
    const gid = groupOf.get(companyId);
    if (!gid) return [];
    if (!othersOf.has(gid)) {
      const others = await prisma.company.findMany({ where: { companyGroupId: gid, archivedAt: null }, select: { id: true, name: true } });
      othersOf.set(gid, others);
    }
    return othersOf.get(gid).filter((c) => c.id !== companyId);
  }

  const matched = [], skipped = [], ambiguous = [];
  for (const s of sets) {
    const others = await otherCompanies(s.companyId);
    if (others.length === 1) {
      matched.push({ id: s.id, invoiceNumber: s.invoiceNumber, buyer: others[0] });
      if (APPLY) await prisma.exportDocumentSet.update({ where: { id: s.id }, data: { buyerCompanyId: others[0].id } });
    } else if (others.length === 0) {
      skipped.push({ id: s.id, invoiceNumber: s.invoiceNumber, reason: "no-group-partner" });
    } else {
      ambiguous.push({ id: s.id, invoiceNumber: s.invoiceNumber, candidates: others.map((c) => c.name) });
    }
  }

  console.log(`\n${APPLY ? "APPLIED" : "DRY-RUN"} — ExportDocumentSet buyer backfill`);
  console.log(`  matched:   ${matched.length}`);
  console.log(`  skipped:   ${skipped.length} (no unambiguous group partner)`);
  console.log(`  ambiguous: ${ambiguous.length} (>1 partner in group — left untouched)`);
  for (const m of matched) console.log(`   ✓ ${m.invoiceNumber} → ${m.buyer.name}`);
  for (const a of ambiguous) console.log(`   ? ${a.invoiceNumber} : ${a.candidates.join(" | ")}`);
  if (!APPLY) console.log(`\nRun with --apply to persist.`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
