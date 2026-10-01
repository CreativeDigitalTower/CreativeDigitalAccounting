// Reconciliation: историческите УСПЕШНО ГЕНЕРИРАНИ активни експортни документи, останали
// със status="draft" от преди auto-finalize правилото (PR #231), се превеждат към
// "finalized". Forward-safe: НЕ създава документи, НЕ regenerate-ва съдържание, НЕ пипа
// data/snapshot/attachments/invoice relations/ExportDocumentSet бизнес данни, НЕ активира
// CMR Epson, НЕ докосва изтрити документи.
//
// Критерий „реално генериран" (надежден от schema/data): в кодовата база ExportDocument се
// създава ЕДИНСТВЕНО чрез regenerateSetDocuments (upsert с buildDocumentData) или чрез
// редактора (update с data) — и двата път пишат непразен JSON `data`. Затова:
//   активен docType (invoice|dispatch|declaration|cmr_hp) + status="draft" + непразно `data`
//   + доставката не е изтрита → успешно генериран draft → FINALIZE (само статус).
// Празен/невалиден draft (data == null/{}) се SKIP-ва (не се финализира сляпо).
//
//   DRY-RUN (по подразбиране, нищо не пише):
//     node --env-file=.env scripts/reconcile-export-document-statuses.mjs --company <companyId>
//   APPLY (изрично):
//     node --env-file=.env scripts/reconcile-export-document-statuses.mjs --company <companyId> --apply
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

if (!process.env.DATABASE_URL) { console.error("DATABASE_URL липсва."); process.exit(1); }
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

const APPLY = process.argv.includes("--apply");
const arg = (f) => { const i = process.argv.indexOf(f); return i >= 0 ? process.argv[i + 1] : null; };
const companyId = arg("--company");

const ACTIVE = ["invoice", "dispatch", "declaration", "cmr_hp"];
const isNonEmpty = (data) => data != null && typeof data === "object" && !Array.isArray(data) && Object.keys(data).length > 0;

async function main() {
  if (!companyId) { console.error("Задължителен --company <companyId> (company-scoped)."); process.exit(1); }
  const company = await prisma.company.findUnique({ where: { id: companyId }, select: { id: true, name: true } });
  if (!company) { console.error("Фирмата не е намерена:", companyId); process.exit(1); }

  console.log(`\n${APPLY ? "APPLY" : "DRY-RUN"} · reconcile export document statuses · ${company.name} (${company.id})\n`);

  const sets = await prisma.exportDocumentSet.findMany({
    where: { companyId, deletedAt: null },
    select: { id: true, invoiceNumber: true, documents: { select: { id: true, docType: true, status: true, data: true } } },
    orderBy: { createdAt: "asc" },
  });

  let docsScanned = 0, draftGenerated = 0, toFinalize = 0, becoming44 = 0, skippedEmpty = 0, errors = 0;
  const now = new Date();
  const header = "EXPORT SET".padEnd(12) + "| INVOICE   | DISPATCH  | DECLARAT. | CMR HP    | BEFORE | ACTION";
  console.log(header); console.log("-".repeat(header.length));

  for (const set of sets) {
    const byType = new Map(set.documents.map((d) => [d.docType, d]));
    const cell = (dt) => { const d = byType.get(dt); return d ? (d.status === "finalized" ? "finalized" : "draft") : "—"; };
    const finalizedBefore = ACTIVE.filter((dt) => byType.get(dt)?.status === "finalized").length;
    // Кандидати за финализиране: активен, draft, непразно data.
    const candidates = [];
    for (const dt of ACTIVE) {
      const d = byType.get(dt);
      if (!d || d.status !== "draft") continue;
      docsScanned++; draftGenerated++;
      if (!isNonEmpty(d.data)) { skippedEmpty++; continue; } // празен/невалиден draft → SKIP
      candidates.push(d);
    }
    if (candidates.length === 0) continue;
    const finalizedAfter = ACTIVE.filter((dt) => { const d = byType.get(dt); return d && (d.status === "finalized" || candidates.some((c) => c.id === d.id)); }).length;
    const action = `FINALIZE ${candidates.map((c) => c.docType).join(", ")}`;
    console.log(
      set.invoiceNumber.padEnd(12) + "| " +
      cell("invoice").padEnd(10) + "| " + cell("dispatch").padEnd(10) + "| " + cell("declaration").padEnd(10) + "| " + cell("cmr_hp").padEnd(10) + "| " +
      `${finalizedBefore}/4`.padEnd(7) + "| " + action + ` → ${finalizedAfter}/4`,
    );
    toFinalize += candidates.length;
    if (finalizedBefore < 4 && finalizedAfter === 4) becoming44++;

    if (APPLY) {
      try {
        await prisma.exportDocument.updateMany({
          where: { id: { in: candidates.map((c) => c.id) }, status: "draft" }, // idempotent: само все още draft
          data: { status: "finalized", finalizedAt: now },
        });
      } catch (e) { errors++; console.error("  ! грешка:", e.message); }
    }
  }

  console.log("\nSummary");
  console.log("  Sets scanned:            ", sets.length);
  console.log("  Documents scanned:       ", docsScanned);
  console.log("  Draft generated found:   ", draftGenerated);
  console.log("  Documents to finalize:   ", toFinalize);
  console.log("  Sets becoming 4/4:       ", becoming44);
  console.log("  Skipped (empty/invalid): ", skippedEmpty);
  console.log("  Errors:                  ", errors);
  console.log(APPLY ? "\nAPPLIED.\n" : "\nDRY-RUN — нищо не е записано. Добавете --apply за прилагане.\n");
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
