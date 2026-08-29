// ПЪЛЕН reset на cement продуктовия каталог (§19/§20/§27). Привежда каталога на всяка
// cement-фирма до ТОЧНО шестте canonical марки и ИЗТРИВА всички стари/non-canonical
// продукти. Source of truth за данните е src/lib/logistics/cementCatalog.ts — изброени
// тук (deployment tooling), защото .mjs не може да import-не .ts. Дръжте ги синхронни.
//
// БЕЗОПАСНОСТ:
//   - Hard delete на non-canonical е безопасен: LogisticsProductAlias → onDelete Cascade;
//     Shipment.product → onDelete SetNull (пази productNameSnapshot);
//     ExportDocumentSet.logisticsProductId е гола колона (пази productSnapshot).
//     → Historical snapshots НЕ се повреждат (§2/§12).
//   - Company-scoped: пипа само фирми, които имат LogisticsProduct (cement модула, §18).
//   - --keep-custom пази user продукти (isSystemDefault=false) — за БЪДЕЩИ повторни runs (§21).
//
// Класификация:
//   CREATE  – canonical липсва → създай
//   UPDATE  – canonical налице → приведи име/category/unit/material/active
//   DELETE  – non-canonical → изтрий (или KEEP при --keep-custom за user продукти)
//
// Употреба:
//   node scripts/reset-cement-catalog.mjs                 → DRY-RUN (само отчет)
//   node scripts/reset-cement-catalog.mjs --apply         → пълен reset (изтрива старите)
//   node scripts/reset-cement-catalog.mjs --apply --keep-custom  → пази user custom продукти
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });
const APPLY = process.argv.includes("--apply");
const KEEP_CUSTOM = process.argv.includes("--keep-custom");

const CyrLat = { А:"A",В:"B",Е:"E",К:"K",М:"M",Н:"H",О:"O",Р:"P",С:"C",Т:"T",Х:"X",а:"a",е:"e",о:"o",р:"p",с:"c" };
const norm = (s) => (s ?? "").toUpperCase().split("").map((ch) => CyrLat[ch] ?? ch).join("")
  .replace(/,/g, ".").replace(/\s+/g, "").replace(/\//g, "").replace(/-/g, "");

const CATALOG = [
  { canonicalName: "CEM II A-LL 52.5 N", category: "bulk", unit: "t", packaging: null, materialCode: "14012840", aliases: ["CEM II A-LL 52,5 N", "A-LL 52.5 N"] },
  { canonicalName: "CEM II A-LL 42.5 R", category: "bulk", unit: "t", packaging: null, materialCode: "14008014", aliases: ["CEM II A-LL 42,5 R", "CEM II 42,5 R"] },
  { canonicalName: "CEM II B0LL 52.5 N", category: "bulk", unit: "t", packaging: null, materialCode: null, aliases: ["CEM II B0LL 52,5 N"] },
  { canonicalName: "CEM II B-LL 42.5 R", category: "packaged", unit: "t", packaging: "25 kg bags", materialCode: null, aliases: ["CEM II B-LL 42,5 R", "B-LL 42.5 R"] },
  { canonicalName: "CEM II B-LL 32.5 R", category: "packaged", unit: "t", packaging: "25 kg bags", materialCode: null, aliases: ["CEM II B-LL 32,5 R", "B-LL 32.5 R"] },
  { canonicalName: "CEM II C-M V-LL 42.5 N", category: "packaged", unit: "t", packaging: "25 kg bags", materialCode: null, aliases: ["CEM II C-M V-LL 42,5 N"] },
];
const CANON_KEYS = new Set(CATALOG.map((p) => norm(p.canonicalName)));

async function ensureAliases(companyId, productId, aliases, key) {
  for (const a of aliases) {
    const an = norm(a);
    if (an === key) continue;
    const clash = await prisma.logisticsProductAlias.findUnique({ where: { companyId_normalizedAlias: { companyId, normalizedAlias: an } }, select: { id: true } });
    if (!clash) await prisma.logisticsProductAlias.create({ data: { companyId, productId, alias: a, normalizedAlias: an } });
  }
}

async function main() {
  const companyIds = [...new Set((await prisma.logisticsProduct.findMany({ select: { companyId: true } })).map((p) => p.companyId))];
  const sum = { companies: companyIds.length, CREATE: 0, UPDATE: 0, DELETE: 0, KEEP_CUSTOM: 0 };

  for (const companyId of companyIds) {
    const products = await prisma.logisticsProduct.findMany({ where: { companyId }, select: { id: true, canonicalName: true, normalizedName: true, materialCode: true, isSystemDefault: true } });
    const byKey = new Map(products.map((p) => [p.normalizedName, p]));

    // Canonical: CREATE / UPDATE.
    for (const p of CATALOG) {
      const key = norm(p.canonicalName);
      const ex = byKey.get(key);
      if (!ex) {
        sum.CREATE++; console.log(`  [CREATE]  ${companyId}  ${p.canonicalName} (${p.category})`);
        if (APPLY) {
          const created = await prisma.logisticsProduct.create({ data: { companyId, canonicalName: p.canonicalName, normalizedName: key, unit: p.unit, packaging: p.packaging, category: p.category, materialCode: p.materialCode, isSystemDefault: true, active: true }, select: { id: true } });
          await ensureAliases(companyId, created.id, p.aliases, key);
        }
      } else {
        sum.UPDATE++; console.log(`  [UPDATE]  ${companyId}  ${ex.canonicalName} → "${p.canonicalName}", ${p.category}, active`);
        if (APPLY) {
          await prisma.logisticsProduct.update({ where: { id: ex.id }, data: { canonicalName: p.canonicalName, category: p.category, unit: p.unit, isSystemDefault: true, active: true, ...(p.materialCode && !ex.materialCode ? { materialCode: p.materialCode } : {}) } });
          await ensureAliases(companyId, ex.id, p.aliases, key);
        }
      }
    }

    // Non-canonical: DELETE (или KEEP_CUSTOM).
    for (const p of products) {
      if (CANON_KEYS.has(p.normalizedName)) continue;
      if (KEEP_CUSTOM && p.isSystemDefault === false) { sum.KEEP_CUSTOM++; console.log(`  [KEEP]    ${companyId}  ${p.canonicalName} (custom, запазен)`); continue; }
      sum.DELETE++; console.log(`  [DELETE]  ${companyId}  ${p.canonicalName}`);
      if (APPLY) await prisma.logisticsProduct.delete({ where: { id: p.id } });
    }
  }

  console.log(`\n${APPLY ? "APPLIED" : "DRY-RUN"} — cement catalog reset${KEEP_CUSTOM ? " (keep-custom)" : ""}`);
  console.log(`  companies: ${sum.companies}`);
  console.log(`  CREATE: ${sum.CREATE}   UPDATE: ${sum.UPDATE}   DELETE: ${sum.DELETE}   KEEP_CUSTOM: ${sum.KEEP_CUSTOM}`);
  if (!APPLY) console.log(`\nНищо не е променяно. Historical snapshots (productSnapshot) остават непокътнати.\nЗа реален reset: node scripts/reset-cement-catalog.mjs --apply`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
