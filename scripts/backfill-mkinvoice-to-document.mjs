// Консолидация на легаси MkInvoice (издадени от получена доставка) към стандартния
// Invoice engine (Document), за да живеят в общия invoice register (§17/§23/§43).
//
// БЕЗОПАСНО и idempotent:
//   - Пипа само MkInvoice с sourceExportSetId != null и documentId == null.
//   - Пропуска, ако вече има Document с този sourceExportSetId (не дублира).
//   - НЕ трие MkInvoice — само създава свързан Document и попълва MkInvoice.documentId
//     (bridge 1:1). Легаси данните остават непокътнати.
//   - Ползва номера на самата MkInvoice за Document.number (запазва номерацията, §11).
//
// Употреба:
//   node scripts/backfill-mkinvoice-to-document.mjs           → DRY-RUN (само отчет)
//   node scripts/backfill-mkinvoice-to-document.mjs --apply   → създава Document + bridge
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });
const APPLY = process.argv.includes("--apply");

async function main() {
  const legacy = await prisma.mkInvoice.findMany({
    where: { sourceExportSetId: { not: null }, documentId: null },
    select: { id: true, companyId: true, clientId: true, sourceExportSetId: true, number: true, date: true, currency: true, vatRate: true, note: true, lines: { select: { productSnapshot: true, unit: true, quantity: true, unitPrice: true, vatAmount: true } } },
  });

  const matched = [], skipped = [], ambiguous = [];
  for (const mk of legacy) {
    if (!mk.sourceExportSetId) { ambiguous.push(mk.number); continue; }
    const existingDoc = await prisma.document.findFirst({ where: { companyId: mk.companyId, sourceExportSetId: mk.sourceExportSetId, deletedAt: null }, select: { id: true } });
    if (existingDoc) {
      // Само свързваме bridge-а, ако липсва (не създаваме втори Document).
      skipped.push({ number: mk.number, reason: "document-exists" });
      if (APPLY) await prisma.mkInvoice.update({ where: { id: mk.id }, data: { documentId: existingDoc.id } });
      continue;
    }
    const numberTaken = await prisma.document.findFirst({ where: { companyId: mk.companyId, number: mk.number }, select: { id: true } });
    if (numberTaken) { skipped.push({ number: mk.number, reason: "number-taken" }); continue; }

    matched.push(mk.number);
    if (APPLY) {
      const vat = mk.vatRate ?? 18;
      const doc = await prisma.document.create({
        data: {
          companyId: mk.companyId, type: "invoice", number: mk.number, clientId: mk.clientId,
          issueDate: mk.date ?? new Date(), currency: mk.currency, status: "issued",
          sourceExportSetId: mk.sourceExportSetId, notes: mk.note ?? null,
          lines: { create: mk.lines.map((l) => ({ description: l.productSnapshot ?? "", quantity: l.quantity, unitPrice: l.unitPrice, vatRate: vat, lineTotal: l.quantity * l.unitPrice * (1 + vat / 100) })) },
        },
        select: { id: true },
      });
      await prisma.mkInvoice.update({ where: { id: mk.id }, data: { documentId: doc.id } });
    }
  }

  console.log(`\n${APPLY ? "APPLIED" : "DRY-RUN"} — MkInvoice → Document consolidation`);
  console.log(`  legacy MkInvoice (source-linked, unbridged): ${legacy.length}`);
  console.log(`  matched (create Document + bridge):          ${matched.length}`);
  console.log(`  skipped:                                     ${skipped.length}`);
  console.log(`  ambiguous (no sourceExportSetId):            ${ambiguous.length}`);
  for (const n of matched) console.log(`   ✓ ${n}`);
  for (const s of skipped) console.log(`   – ${s.number} (${s.reason})`);
  if (!APPLY) console.log(`\nRun with --apply to persist. Легаси MkInvoice НЕ се трият.`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
