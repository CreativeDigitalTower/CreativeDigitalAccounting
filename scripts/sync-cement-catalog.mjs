// Canonical cement каталог sync за СЪЩЕСТВУВАЩИ фирми (§16/§17).
// Source of truth за данните е src/lib/logistics/cementCatalog.ts — тук са изброени
// (deployment tooling), защото .mjs не може да import-не .ts. Дръжте ги синхронни.
//
// БЕЗОПАСНО + idempotent:
//   - Upsert на шестте canonical марки (category, active, isSystemDefault=true).
//   - Архивира (active=false) САМО известните стари system defaults (LEGACY).
//   - НИКОГА не пипа custom продукт на клиента (различно име) и НЕ трие записи.
//   - Historical snapshots (productSnapshot на доставки) не се променят.
//
// Класификация (dry-run показва, apply изпълнява):
//   KEEP    – canonical, вече съществува → обнови category/active
//   CREATE  – canonical, липсва → създай
//   ARCHIVE – известен стар default, активен → деактивирай
//   SKIP    – custom / вече архивиран → не се пипа
//
// Употреба:
//   node scripts/sync-cement-catalog.mjs           → DRY-RUN (само отчет)
//   node scripts/sync-cement-catalog.mjs --apply   → прилага
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });
const APPLY = process.argv.includes("--apply");

// нормализация — огледало на normalizeProductKey (fold кирилица + махане на разделители)
const CyrLat = { А:"A",В:"B",Е:"E",К:"K",М:"M",Н:"H",О:"O",Р:"P",С:"C",Т:"T",Х:"X",а:"a",е:"e",о:"o",р:"p",с:"c" };
const norm = (s) => (s ?? "").toUpperCase().split("").map((ch) => CyrLat[ch] ?? ch).join("")
  .replace(/,/g, ".").replace(/\s+/g, "").replace(/\//g, "").replace(/-/g, "");

const CATALOG = [
  { canonicalName: "CEM II A-LL 52.5 N", category: "bulk", unit: "t", packaging: null, aliases: ["CEM II A-LL 52,5 N", "A-LL 52.5 N", "A-LL 52,5 N"] },
  { canonicalName: "CEM II A-LL 42.5 R", category: "bulk", unit: "t", packaging: null, aliases: ["CEM II A-LL 42,5 R", "CEM II 42,5 R"] },
  { canonicalName: "CEM II B0LL 52.5 N", category: "bulk", unit: "t", packaging: null, aliases: ["CEM II B0LL 52,5 N"] },
  { canonicalName: "CEM II B-LL 42.5 R", category: "packaged", unit: "t", packaging: "25 kg bags", aliases: ["CEM II B-LL 42,5 R", "B-LL 42.5 R"] },
  { canonicalName: "CEM II B-LL 32.5 R", category: "packaged", unit: "t", packaging: "25 kg bags", aliases: ["CEM II B-LL 32,5 R", "B-LL 32.5 R"] },
  { canonicalName: "CEM II C-M V-LL 42.5 N", category: "packaged", unit: "t", packaging: "25 kg bags", aliases: ["CEM II C-M V-LL 42,5 N"] },
];
const LEGACY = ["CEM II B-V 52.5 N", "CEM I 52.5 R", "CEM I 52.5 N", "DEGASET", "CEM IV B(V) 42.5 N"];
const CANON_KEYS = new Set(CATALOG.map((p) => norm(p.canonicalName)));
const LEGACY_KEYS = new Set(LEGACY.map(norm));

async function main() {
  // Само фирми, които вече имат логистични продукти (т.е. активиран Cement модул).
  const companyIds = [...new Set((await prisma.logisticsProduct.findMany({ select: { companyId: true } })).map((p) => p.companyId))];

  const summary = { companies: companyIds.length, CREATE: 0, KEEP: 0, ARCHIVE: 0, SKIP: 0 };
  for (const companyId of companyIds) {
    const products = await prisma.logisticsProduct.findMany({ where: { companyId }, select: { id: true, canonicalName: true, normalizedName: true, active: true } });
    const byKey = new Map(products.map((p) => [p.normalizedName, p]));

    for (const p of CATALOG) {
      const key = norm(p.canonicalName);
      const ex = byKey.get(key);
      if (!ex) {
        summary.CREATE++; console.log(`  [CREATE]  ${companyId}  ${p.canonicalName} (${p.category})`);
        if (APPLY) {
          const created = await prisma.logisticsProduct.create({ data: { companyId, canonicalName: p.canonicalName, normalizedName: key, unit: p.unit, packaging: p.packaging, category: p.category, isSystemDefault: true, active: true }, select: { id: true } });
          for (const a of p.aliases) { const an = norm(a); if (an === key) continue; const clash = await prisma.logisticsProductAlias.findUnique({ where: { companyId_normalizedAlias: { companyId, normalizedAlias: an } }, select: { id: true } }); if (!clash) await prisma.logisticsProductAlias.create({ data: { companyId, productId: created.id, alias: a, normalizedAlias: an } }); }
        }
      } else {
        summary.KEEP++; console.log(`  [KEEP]    ${companyId}  ${ex.canonicalName} → category=${p.category}, active`);
        if (APPLY) await prisma.logisticsProduct.update({ where: { id: ex.id }, data: { category: p.category, isSystemDefault: true, active: true } });
      }
    }
    for (const p of products) {
      if (CANON_KEYS.has(p.normalizedName)) continue;
      if (LEGACY_KEYS.has(p.normalizedName) && p.active) {
        summary.ARCHIVE++; console.log(`  [ARCHIVE] ${companyId}  ${p.canonicalName}`);
        if (APPLY) await prisma.logisticsProduct.update({ where: { id: p.id }, data: { active: false } });
      } else {
        summary.SKIP++; // custom / вече архивиран — не се пипа
      }
    }
  }

  console.log(`\n${APPLY ? "APPLIED" : "DRY-RUN"} — cement catalog sync`);
  console.log(`  companies: ${summary.companies}`);
  console.log(`  CREATE: ${summary.CREATE}   KEEP: ${summary.KEEP}   ARCHIVE: ${summary.ARCHIVE}   SKIP(custom/other): ${summary.SKIP}`);
  if (!APPLY) console.log(`\nRun with --apply to persist. Нищо не е променяно. Custom продукти не се архивират.`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
