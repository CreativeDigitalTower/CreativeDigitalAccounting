// Обединяване на дублирани логистични клиенти (крайните MK клиенти в CRM на SEM). §7/§40.
// Идентификация на фирмата: --company-id | --eik | по име (SEM). STOP при 0 или >1 (§28).
// Приоритет на съвпадение: нормализиран ЕИК → нормализирано име (§3). Ambiguous → SKIP.
// Всички релации се преместват към canonical; празни полета се допълват; дубликатът се трие.
// Historical snapshots НЕ се пипат (само FK/master relation, §5). НЕ пипа други фирми (§32).
//
//   dry-run: node --env-file=.env scripts/dedupe-logistics-clients.mjs --eik <ЕИК на SEM>
//   apply:   node --env-file=.env scripts/dedupe-logistics-clients.mjs --eik <ЕИК на SEM> --apply
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

if (!process.env.DATABASE_URL) { console.error("DATABASE_URL липсва. node --env-file=.env scripts/dedupe-logistics-clients.mjs ..."); process.exit(1); }
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

const APPLY = process.argv.includes("--apply");
const arg = (f) => { const i = process.argv.indexOf(f); return i >= 0 ? process.argv[i + 1] : null; };

const normEik = (e) => ((e ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "") || null);
const normName = (n) => (n ?? "").toUpperCase().replace(/[.,/()"'`«»„“”-]/g, "").replace(/\s+/g, "").trim();
const matchKey = (c) => { const e = normEik(c.eik); return e ? `eik:${e}` : `name:${normName(c.name)}`; };
const MERGEABLE = ["eik", "vatNumber", "address", "baseAddress", "city", "country", "phone", "contactEmail", "contactPerson", "mol"];

// Модели с clientId, които трябва да сочат към canonical (§4). exportDocumentSet е гола колона.
const REL = ["exportDocumentSet", "document", "mkInvoice", "contract", "project", "payment", "projectBoard", "clientNote", "clientContact", "clientTask", "clientFile", "clientEmail", "clientHistoricalMetric", "clientHistoricalProductMetric"];

async function relCounts(clientId) {
  const entries = await Promise.all(REL.map(async (m) => [m, await prisma[m].count({ where: { clientId } })]));
  const obj = Object.fromEntries(entries);
  obj._total = entries.reduce((s, [, n]) => s + n, 0);
  return obj;
}

async function resolveCompany() {
  const id = arg("--company-id"), eik = arg("--eik");
  if (id) { const c = await prisma.company.findUnique({ where: { id }, select: { id: true, name: true, eik: true } }); if (!c) { console.error("Няма фирма с това id."); process.exit(1); } return c; }
  if (eik) { const l = await prisma.company.findMany({ where: { eik }, select: { id: true, name: true, eik: true } }); if (l.length !== 1) { console.error(`Очаквах 1 фирма с ЕИК=${eik}, намерени ${l.length}.`); process.exit(1); } return l[0]; }
  const l = await prisma.company.findMany({ where: { name: { contains: "SEM", mode: "insensitive" } }, select: { id: true, name: true, eik: true } });
  if (l.length !== 1) { console.error(`Име „SEM" даде ${l.length} съвпадения — подайте --company-id или --eik.`, l.map((c) => `${c.id} (${c.name})`).join(", ")); process.exit(1); }
  return l[0];
}

async function main() {
  const company = await resolveCompany();
  const clients = await prisma.client.findMany({ where: { companyId: company.id }, select: { id: true, name: true, eik: true, vatNumber: true, address: true, baseAddress: true, city: true, country: true, phone: true, contactEmail: true, contactPerson: true, mol: true, createdAt: true } });
  console.log(`\n${APPLY ? "APPLY" : "DRY-RUN"} — dedupe logistics clients`);
  console.log(`  Company (SEM): ${company.name} (id=${company.id}, ЕИК=${company.eik}) — клиенти: ${clients.length}\n`);

  // Групиране
  const map = new Map();
  for (const c of clients) { const k = matchKey(c); if (k === "name:") continue; (map.get(k) ?? map.set(k, []).get(k)).push(c); }
  const groups = [...map.values()].filter((g) => g.length > 1);
  if (groups.length === 0) { console.log("Няма дубликати. ✓"); return; }

  let mergedCount = 0;
  for (const group of groups) {
    // relation counts за всеки → избор на canonical (най-много релации, после най-стар)
    const withCounts = await Promise.all(group.map(async (c) => ({ ...c, _rc: await relCounts(c.id) })));
    withCounts.sort((a, b) => b._rc._total - a._rc._total || new Date(a.createdAt) - new Date(b.createdAt) || a.id.localeCompare(b.id));
    const canonical = withCounts[0];
    const dups = withCounts.slice(1);
    console.log(`CANONICAL  ${canonical.name} (id=${canonical.id}, ЕИК=${canonical.eik ?? "—"}, релации=${canonical._rc._total})  [${matchKey(canonical)}]`);
    for (const dup of dups) {
      const moves = Object.entries(dup._rc).filter(([k, v]) => k !== "_total" && v > 0).map(([k, v]) => `${k}:${v}`).join(", ") || "нищо";
      const fills = MERGEABLE.filter((f) => !(canonical[f] ?? "").toString().trim() && (dup[f] ?? "").toString().trim());
      const conflicts = MERGEABLE.filter((f) => { const cv = (canonical[f] ?? "").toString().trim().toLowerCase(); const dv = (dup[f] ?? "").toString().trim().toLowerCase(); return cv && dv && cv !== dv; });
      console.log(`  DUPLICATE  ${dup.name} (id=${dup.id}, ЕИК=${dup.eik ?? "—"})`);
      console.log(`    MATCH_REASON: ${matchKey(dup) === matchKey(canonical) ? (normEik(dup.eik) ? "ЕИК" : "нормализирано име") : "?"}`);
      console.log(`    RELATIONS_TO_MOVE: ${moves}`);
      console.log(`    FIELD_MERGES: ${fills.join(", ") || "няма"}${conflicts.length ? `    CONFLICTS: ${conflicts.join(", ")}` : ""}`);
      if (!APPLY) continue;
      try {
        await prisma.$transaction(async (tx) => {
          for (const m of REL) await tx[m].updateMany({ where: { clientId: dup.id }, data: { clientId: canonical.id } });
          const fillData = {}; for (const f of fills) fillData[f] = dup[f];
          if (Object.keys(fillData).length) await tx.client.update({ where: { id: canonical.id }, data: fillData });
          // verify: нищо не сочи вече към dup
          for (const m of REL) { const left = await tx[m].count({ where: { clientId: dup.id } }); if (left > 0) throw new Error(`verify fail: ${m} still ${left}`); }
          await tx.client.delete({ where: { id: dup.id } });
        });
        console.log("    ✓ merged");
        mergedCount++;
      } catch (e) {
        console.log(`    ✗ SKIPPED (rollback): ${e.message}`);
      }
    }
  }
  console.log(`\n${APPLY ? `Готово. Обединени дубликати: ${mergedCount}.` : `Открити групи дубликати: ${groups.length}. Пуснете с --apply за обединяване.`}`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
