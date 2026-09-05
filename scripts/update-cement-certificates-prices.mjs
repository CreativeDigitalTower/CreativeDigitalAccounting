// Production data update за циментовия каталог на МЕТАЛ ТРЕЙД КЮСТЕНДИЛ 2005 ООД (§21-§29).
// Актуализира СЪЩЕСТВУВАЩИТЕ 6 продукта до официалните canonical имена + категория +
// сертификатен номер + покупна цена/валута. При преименуване добавя старото име като alias.
// НЕ създава дубликати, НЕ качва PDF, НЕ пипа исторически snapshots, НЕ пипа други фирми.
//
// Идентификация на фирмата: --company-id <id> | --eik <ЕИК> | по име (МЕТАЛ ТРЕЙД / METAL TRADE),
// STOP при 0 или >1 (§28). При ambiguous/missing продукт → STOP (§26); за ръчно назначаване
// подай --assign <slug>=<productId> (slug: bulk1,bulk2,bulk3,pack1,pack2,pack3).
//
//   dry-run: node --env-file=.env scripts/update-cement-certificates-prices.mjs --eik <ЕИК>
//   apply:   node --env-file=.env scripts/update-cement-certificates-prices.mjs --eik <ЕИК> --apply
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL липсва. Стартирайте с: node --env-file=.env scripts/update-cement-certificates-prices.mjs ...");
  process.exit(1);
}
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

const APPLY = process.argv.includes("--apply");
const arg = (f) => { const i = process.argv.indexOf(f); return i >= 0 ? process.argv[i + 1] : null; };
// Прости --assign slug=productId (може многократно):
const ASSIGN = {};
process.argv.forEach((a, i) => { if (a === "--assign" && process.argv[i + 1]) { const [k, v] = process.argv[i + 1].split("="); if (k && v) ASSIGN[k] = v; } });

// Нормализация, идентична на normalizeProductKey (без foldCyrillic — имената са латиница).
const norm = (s) => (s ?? "").toUpperCase().replace(/,/g, ".").replace(/\s+/g, "").replace(/\//g, "").replace(/-/g, "");

// Официалните 6 продукта (§3/§22/§23). matchKeys = нормализирани кандидат-имена (canonical + стари варианти).
const TARGETS = [
  { slug: "bulk1", name: "CEM II A-LL 42.5 R", category: "bulk", certificate: "2032-CPR-19.135C", price: 66.91, keys: ["CEM II A-LL 42.5 R"] },
  { slug: "bulk2", name: "CEM II A-LL 52.5 N", category: "bulk", certificate: "2032-CPR-20.18A", price: 70.00, keys: ["CEM II A-LL 52.5 N"] },
  { slug: "bulk3", name: "CEM II B-V 52.5 N", category: "bulk", certificate: "2032-CPR-25.2", price: 64.36, keys: ["CEM II B-V 52.5 N", "CEM II B0LL 52.5 N", "CEM II B-LL 52.5 N"] },
  { slug: "pack1", name: "CEM II B-LL 42.5 R", category: "packaged", certificate: "2032-CPR-19.78C", price: 69.47, keys: ["CEM II B-LL 42.5 R"] },
  { slug: "pack2", name: "CEM II B-LL 32.5 R", category: "packaged", certificate: "2032-CPR-19.79C", price: 66.91, keys: ["CEM II B-LL 32.5 R"] },
  { slug: "pack3", name: "CEM II C-M (V-LL) 42.5 N", category: "packaged", certificate: "07-НУРВСПСРБ-24.19", price: 64.36, keys: ["CEM II C-M (V-LL) 42.5 N", "CEM II C-M V-LL 42.5 N"] },
];
const CURRENCY = "EUR";

async function resolveCompany() {
  const id = arg("--company-id"); const eik = arg("--eik");
  if (id) { const c = await prisma.company.findUnique({ where: { id }, select: { id: true, name: true, eik: true } }); if (!c) { console.error(`Няма фирма с id=${id}.`); process.exit(1); } return c; }
  if (eik) { const l = await prisma.company.findMany({ where: { eik }, select: { id: true, name: true, eik: true } }); if (l.length !== 1) { console.error(`Очаквах 1 фирма с ЕИК=${eik}, намерени ${l.length}.`); process.exit(1); } return l[0]; }
  const byName = await prisma.company.findMany({ where: { OR: [{ name: { contains: "МЕТАЛ ТРЕЙД", mode: "insensitive" } }, { name: { contains: "METAL TRADE", mode: "insensitive" } }] }, select: { id: true, name: true, eik: true } });
  if (byName.length !== 1) { console.error(`Име „Метал Трейд" даде ${byName.length} съвпадения — подайте --company-id или --eik.`, byName.map((c) => `${c.id} (${c.name}, ЕИК ${c.eik})`).join(", ")); process.exit(1); }
  return byName[0];
}

async function main() {
  const company = await resolveCompany();
  const products = await prisma.logisticsProduct.findMany({
    where: { companyId: company.id }, select: { id: true, canonicalName: true, category: true, materialCode: true, certificateNumber: true, purchasePrice: true, purchaseCurrency: true, aliases: { select: { alias: true } } },
  });
  console.log(`\n${APPLY ? "APPLY" : "DRY-RUN"} — Cement catalog update`);
  console.log(`  Company: ${company.name} (id=${company.id}, ЕИК=${company.eik}) — общо продукти: ${products.length}\n`);

  const used = new Set();
  const plan = [];
  let blocked = false;
  for (const tgt of TARGETS) {
    let matched;
    if (ASSIGN[tgt.slug]) {
      matched = products.find((p) => p.id === ASSIGN[tgt.slug]);
      if (!matched) { console.error(`ASSIGN ${tgt.slug}=${ASSIGN[tgt.slug]}: няма такъв продукт.`); process.exit(1); }
    } else {
      const keys = new Set(tgt.keys.map(norm));
      const cands = products.filter((p) => !used.has(p.id) && (keys.has(norm(p.canonicalName)) || p.aliases.some((a) => keys.has(norm(a.alias)))));
      if (cands.length === 1) matched = cands[0];
      else if (cands.length === 0) { console.log(`  MISSING   ${tgt.name} — няма кандидат (подайте --assign ${tgt.slug}=<productId>)`); blocked = true; continue; }
      else { console.log(`  AMBIGUOUS ${tgt.name} — ${cands.length} кандидата: ${cands.map((c) => `${c.id} (${c.canonicalName})`).join(", ")} (подайте --assign ${tgt.slug}=<productId>)`); blocked = true; continue; }
    }
    used.add(matched.id);
    const rename = matched.canonicalName !== tgt.name;
    console.log(`  ${rename ? "RENAME  " : "MATCH   "} ${matched.canonicalName}${rename ? `  →  ${tgt.name}` : ""}`);
    console.log(`            CATEGORY ${matched.category ?? "—"} → ${tgt.category} · CERT ${matched.certificateNumber ?? "—"} → ${tgt.certificate} · PRICE ${matched.purchasePrice ?? "—"} → ${tgt.price} ${CURRENCY} · MATCODE ${matched.materialCode ?? "—"} (запазен)`);
    plan.push({ tgt, matched, rename });
  }

  if (blocked) { console.error("\n✗ Има MISSING/AMBIGUOUS продукти — прекратявам без промяна (§26). Разрешете чрез --assign."); process.exit(1); }
  if (!APPLY) { console.log("\nНищо не е променяно. Пуснете с --apply за реално прилагане."); return; }

  for (const { tgt, matched, rename } of plan) {
    await prisma.$transaction(async (tx) => {
      await tx.logisticsProduct.update({
        where: { id: matched.id },
        data: { canonicalName: tgt.name, normalizedName: norm(tgt.name), category: tgt.category, certificateNumber: tgt.certificate, purchasePrice: tgt.price, purchaseCurrency: CURRENCY },
      });
      if (rename) {
        const an = norm(matched.canonicalName);
        const clash = await tx.logisticsProductAlias.findUnique({ where: { companyId_normalizedAlias: { companyId: company.id, normalizedAlias: an } }, select: { id: true } });
        if (!clash) await tx.logisticsProductAlias.create({ data: { companyId: company.id, productId: matched.id, alias: matched.canonicalName, normalizedAlias: an } });
      }
    });
  }

  // Re-read verification (§27).
  const after = await prisma.logisticsProduct.findMany({ where: { companyId: company.id, id: { in: plan.map((p) => p.matched.id) } }, select: { canonicalName: true, category: true, certificateNumber: true, purchasePrice: true, purchaseCurrency: true }, orderBy: { canonicalName: "asc" } });
  console.log("\n✓ Приложено. Актуален каталог:");
  for (const p of after) console.log(`  ${p.category === "bulk" ? "НАСИПЕН  " : "ПАКЕТИРАН"}  ${p.canonicalName}  ·  ${p.certificateNumber}  ·  ${Number(p.purchasePrice).toFixed(2)} ${p.purchaseCurrency}/t`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
