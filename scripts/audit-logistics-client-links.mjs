// CROSS-COMPANY audit/migration за крайните MK клиенти (§11/§12). Част от старите Export
// Deliveries сочат ExportDocumentSet.clientId към Client под МЕТАЛ ТРЕЙД, докато същият реален
// клиент съществува и като Client под SEM. Тук ги консолидираме към canonical SEM Client.
//
// Идентификация:
//   SEM:         --sem-id <companyId> | --sem-eik <ЕИК> | по име (SEM)
//   Metal Trade: --metal-id <companyId> | --metal-eik <ЕИК> | по име (МЕТАЛ ТРЕЙД / METAL TRADE)
//
// Мач: нормализиран ЕИК → нормализирано име (§8). Ambiguous (>1 SEM съвпадение) → SKIP (§8/§13).
// Премества САМО ExportDocumentSet.clientId към canonical SEM (§4). Historical snapshots НЕ се
// пипат (§5). Foreign (Metal Trade) Client се трие само ако НЯМА никакви други релации (§12);
// иначе се архивира. Празни полета на canonical може да се допълнят (§15).
//
//   dry-run: node --env-file=.env scripts/audit-logistics-client-links.mjs
//   apply:   node --env-file=.env scripts/audit-logistics-client-links.mjs --apply
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

if (!process.env.DATABASE_URL) { console.error("DATABASE_URL липсва. node --env-file=.env scripts/audit-logistics-client-links.mjs ..."); process.exit(1); }
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

const APPLY = process.argv.includes("--apply");
const arg = (f) => { const i = process.argv.indexOf(f); return i >= 0 ? process.argv[i + 1] : null; };

const normEik = (e) => ((e ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "") || null);
const normName = (n) => (n ?? "").toUpperCase().replace(/[.,/()"'`«»„“”-]/g, "").replace(/\s+/g, "").trim();
const key = (c) => { const e = normEik(c.eik); return e ? `eik:${e}` : `name:${normName(c.name)}`; };
const MERGEABLE = ["eik", "vatNumber", "address", "baseAddress", "city", "country", "phone", "contactEmail", "contactPerson", "mol"];
// Всички модели с clientId (за проверка „други релации" на foreign клиента).
const REL = ["exportDocumentSet", "document", "mkInvoice", "contract", "project", "payment", "projectBoard", "clientNote", "clientContact", "clientTask", "clientFile", "clientEmail", "clientHistoricalMetric", "clientHistoricalProductMetric"];

async function resolveCompany(kind, idFlag, eikFlag, nameNeedles) {
  const id = arg(idFlag), eik = arg(eikFlag);
  if (id) { const c = await prisma.company.findUnique({ where: { id }, select: { id: true, name: true, eik: true } }); if (!c) { console.error(`${kind}: няма фирма с id=${id}.`); process.exit(1); } return c; }
  if (eik) { const l = await prisma.company.findMany({ where: { eik }, select: { id: true, name: true, eik: true } }); if (l.length !== 1) { console.error(`${kind}: очаквах 1 фирма с ЕИК=${eik}, намерени ${l.length}.`); process.exit(1); } return l[0]; }
  const l = await prisma.company.findMany({ where: { OR: nameNeedles.map((n) => ({ name: { contains: n, mode: "insensitive" } })) }, select: { id: true, name: true, eik: true } });
  if (l.length !== 1) { console.error(`${kind}: име даде ${l.length} съвпадения — подайте ${idFlag}/${eikFlag}.`, l.map((c) => `${c.id} (${c.name})`).join(", ")); process.exit(1); }
  return l[0];
}

async function otherRelCount(clientId) {
  const entries = await Promise.all(REL.filter((m) => m !== "exportDocumentSet").map(async (m) => [m, await prisma[m].count({ where: { clientId } })]));
  return { byModel: Object.fromEntries(entries.filter(([, n]) => n > 0)), total: entries.reduce((s, [, n]) => s + n, 0) };
}

async function main() {
  const sem = await resolveCompany("SEM", "--sem-id", "--sem-eik", ["SEM"]);
  const metal = await resolveCompany("Metal Trade", "--metal-id", "--metal-eik", ["МЕТАЛ ТРЕЙД", "METAL TRADE"]);
  console.log(`\n${APPLY ? "APPLY" : "DRY-RUN"} — cross-company logistics client links`);
  console.log(`  SEM (canonical): ${sem.name} (${sem.id})`);
  console.log(`  Metal Trade:     ${metal.name} (${metal.id}, ЕИК ${metal.eik})\n`);

  const semClients = await prisma.client.findMany({ where: { companyId: sem.id }, select: { id: true, name: true, eik: true, vatNumber: true, address: true, baseAddress: true, city: true, country: true, phone: true, contactEmail: true, contactPerson: true, mol: true } });
  const semByKey = new Map();
  for (const c of semClients) { const k = key(c); if (!semByKey.has(k)) semByKey.set(k, []); semByKey.get(k).push(c); }

  // Foreign (не-SEM) клиенти, реферирани от export deliveries.
  const distinct = await prisma.exportDocumentSet.findMany({ where: { clientId: { not: null } }, select: { clientId: true }, distinct: ["clientId"] });
  const foreignIds = distinct.map((d) => d.clientId);
  const foreignClients = await prisma.client.findMany({ where: { id: { in: foreignIds }, companyId: { not: sem.id } }, select: { id: true, companyId: true, name: true, eik: true, vatNumber: true, address: true, baseAddress: true, city: true, country: true, phone: true, contactEmail: true, contactPerson: true, mol: true } });

  if (foreignClients.length === 0) { console.log("Няма export deliveries, сочещи към не-SEM клиент. ✓"); return; }

  let migrated = 0;
  for (const fc of foreignClients) {
    const k = key(fc);
    const matches = semByKey.get(k) ?? [];
    const deliveries = await prisma.exportDocumentSet.count({ where: { clientId: fc.id } });
    const other = await otherRelCount(fc.id);
    const ambiguous = matches.length > 1;
    const canonical = matches[0];
    console.log(`CLIENT ${fc.name} (ЕИК ${fc.eik ?? "—"})`);
    console.log(`  METAL_TRADE_CLIENT_ID: ${fc.id} (company ${fc.companyId})`);
    console.log(`  SEM_CLIENT_ID: ${canonical?.id ?? "— (няма SEM съвпадение)"}`);
    console.log(`  MATCH_REASON: ${canonical ? (normEik(fc.eik) ? "ЕИК" : "нормализирано име") : "—"}`);
    console.log(`  EXPORT_DELIVERIES_TO_MOVE: ${deliveries}`);
    console.log(`  OTHER_RELATIONS: ${other.total ? JSON.stringify(other.byModel) : "няма"}`);
    console.log(`  AMBIGUOUS: ${ambiguous ? "ДА" : "не"}`);
    const safe = !!canonical && !ambiguous;
    console.log(`  SAFE_TO_MIGRATE: ${safe ? "ДА" : "НЕ"}`);
    if (!APPLY || !safe) continue;
    try {
      await prisma.$transaction(async (tx) => {
        // 1) премести само ExportDocumentSet.clientId → canonical SEM (§4)
        await tx.exportDocumentSet.updateMany({ where: { clientId: fc.id }, data: { clientId: canonical.id } });
        // 2) допълни празни полета на canonical от foreign (§15) — без презапис на конфликти
        const fill = {}; for (const f of MERGEABLE) { if (!(canonical[f] ?? "").toString().trim() && (fc[f] ?? "").toString().trim()) fill[f] = fc[f]; }
        if (Object.keys(fill).length) await tx.client.update({ where: { id: canonical.id }, data: fill });
        // 3) verify: няма export set към foreign
        const left = await tx.exportDocumentSet.count({ where: { clientId: fc.id } });
        if (left > 0) throw new Error(`verify fail: ${left} export sets still linked`);
        // 4) foreign Client: трие се само ако НЯМА никакви други релации (§12); иначе архив
        const rest = await otherRelCount(fc.id);
        if (rest.total === 0) await tx.client.delete({ where: { id: fc.id } });
        else await tx.client.update({ where: { id: fc.id }, data: { archivedAt: new Date() } });
      });
      console.log("  ✓ migrated");
      migrated++;
    } catch (e) {
      console.log(`  ✗ SKIPPED (rollback): ${e.message}`);
    }
  }
  console.log(`\n${APPLY ? `Готово. Мигрирани: ${migrated}.` : `Открити foreign клиенти с доставки: ${foreignClients.length}. Пуснете с --apply.`}`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
