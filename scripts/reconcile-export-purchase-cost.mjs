// Reconciliation на покупната стойност (payable към Holcim) за ИСТОРИЧЕСКИ Export Deliveries
// без snapshot (purchaseAmount == null). КРИТИЧНО (§N): текущата master purchasePrice НЕ е
// доказана историческа цена. Затова този script по подразбиране САМО докладва кандидат-цени
// и confidence/source; записва единствено при --apply и само за записи, чиято цена е
// намерена от продукта (confidence = current-master). Без доказуема цена → UNRESOLVED (не се
// измисля). НИЩО не се пише без --apply.
//
//   DRY-RUN:  node --env-file=.env scripts/reconcile-export-purchase-cost.mjs --company <id>
//   APPLY:    node --env-file=.env scripts/reconcile-export-purchase-cost.mjs --company <id> --apply
import { PrismaClient, Prisma } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

if (!process.env.DATABASE_URL) { console.error("DATABASE_URL липсва."); process.exit(1); }
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

const APPLY = process.argv.includes("--apply");
const arg = (f) => { const i = process.argv.indexOf(f); return i >= 0 ? process.argv[i + 1] : null; };
const companyId = arg("--company");

const D = Prisma.Decimal;
const amount = (q, p) => (q == null || p == null) ? null : new D(q).times(p).toDecimalPlaces(2).toNumber();

async function main() {
  if (!companyId) { console.error("Задължителен --company <companyId>."); process.exit(1); }
  const company = await prisma.company.findUnique({ where: { id: companyId }, select: { id: true, name: true } });
  if (!company) { console.error("Фирмата не е намерена:", companyId); process.exit(1); }
  console.log(`\n${APPLY ? "APPLY" : "DRY-RUN"} · reconcile export purchase cost · ${company.name}\n`);

  const sets = await prisma.exportDocumentSet.findMany({
    where: { companyId, deletedAt: null, purchaseAmount: null },
    select: { id: true, invoiceNumber: true, quantity: true, productSnapshot: true, logisticsProductId: true },
    orderBy: { createdAt: "asc" },
  });

  let scanned = 0, candidates = 0, unresolved = 0, applied = 0;
  const header = "DELIVERY".padEnd(12) + "| PRODUCT".padEnd(26) + "| QTY".padEnd(10) + "| PRICE".padEnd(10) + "| AMOUNT".padEnd(12) + "| SOURCE/CONFIDENCE";
  console.log(header); console.log("-".repeat(header.length));

  for (const s of sets) {
    scanned++;
    const prod = s.logisticsProductId ? await prisma.logisticsProduct.findUnique({ where: { id: s.logisticsProductId }, select: { purchasePrice: true, purchaseCurrency: true } }) : null;
    const price = prod?.purchasePrice != null ? Number(prod.purchasePrice) : null;
    const amt = amount(s.quantity, price);
    const resolved = price != null && s.quantity != null;
    const src = !s.logisticsProductId ? "UNRESOLVED (няма продукт)"
      : price == null ? "UNRESOLVED (няма master цена)"
      : s.quantity == null ? "UNRESOLVED (няма количество)"
      : "current-master (НЕ е доказана историческа цена)";
    if (resolved) candidates++; else unresolved++;
    console.log(
      s.invoiceNumber.padEnd(12) + "| " + String(s.productSnapshot ?? "—").slice(0, 24).padEnd(24) + "| " +
      String(s.quantity ?? "—").padEnd(8) + "| " + String(price ?? "—").padEnd(8) + "| " + String(amt ?? "—").padEnd(10) + "| " + src,
    );
    if (APPLY && resolved) {
      await prisma.exportDocumentSet.updateMany({
        where: { id: s.id, purchaseAmount: null }, // idempotent: само ако още няма snapshot
        data: { purchaseUnitPrice: price, purchaseCurrency: prod.purchaseCurrency ?? "EUR", purchaseAmount: amt },
      });
      applied++;
    }
  }

  console.log("\nSummary");
  console.log("  Deliveries scanned (no snapshot):", scanned);
  console.log("  Resolvable candidates:           ", candidates);
  console.log("  Unresolved (НЕ се пипат):        ", unresolved);
  if (APPLY) console.log("  Applied:                         ", applied);
  console.log(APPLY ? "\nAPPLIED (само resolvable; unresolved остават null).\n" : "\nDRY-RUN — нищо не е записано. Добавете --apply за прилагане.\n");
  console.log("ВНИМАНИЕ: current-master цената НЕ е доказана историческа цена. Прегледай преди --apply.\n");
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
