// Master-data ъпдейт на логистичните клиенти на SEM INTERNATIONAL DOOEL (§9). Match към
// съществуващите canonical записи (без duplicate); update на регистрационен/базов адрес,
// city/country, попълване на ЕДБ при празно. Създава липсващите под SEM. Idempotent.
//
// Match: нормализиран ЕДБ (с махане на водещ „MK") → нормализирано име (§2). Без fuzzy.
// ЕДБ при конфликт НЕ се презаписва (§5/§9). Historical snapshots НЕ се пипат (§3).
// M.B. (напр. BAU 5756464) НЯМА поле в Client → само се докладва, не се записва (§5/§7).
//
//   dry-run: node --env-file=.env scripts/update-logistics-client-bases.mjs --sem-id cmsusi7ul0000zm8nfqwiy2pu
//   apply:   node --env-file=.env scripts/update-logistics-client-bases.mjs --sem-id cmsusi7ul0000zm8nfqwiy2pu --apply
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

if (!process.env.DATABASE_URL) { console.error("DATABASE_URL липсва. node --env-file=.env scripts/update-logistics-client-bases.mjs ..."); process.exit(1); }
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

const APPLY = process.argv.includes("--apply");
const arg = (f) => { const i = process.argv.indexOf(f); return i >= 0 ? process.argv[i + 1] : null; };

const __dir = path.dirname(fileURLToPath(import.meta.url));
const DATASET = JSON.parse(fs.readFileSync(path.join(__dir, "data", "logistics-client-bases.json"), "utf-8"));

const normName = (n) => (n ?? "").toUpperCase().replace(/[.,/()"'`«»„“”-]/g, "").replace(/\s+/g, "").trim();
const normEikMk = (e) => { const v = (e ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "").replace(/^MK/, ""); return v || null; };
const nz = (s) => (s ?? "").trim();
const diff = (a, b) => nz(a) !== nz(b);

async function resolveSem() {
  const id = arg("--sem-id"), eik = arg("--sem-eik");
  if (id) { const c = await prisma.company.findUnique({ where: { id }, select: { id: true, name: true } }); if (!c) { console.error(`Няма фирма с id=${id}.`); process.exit(1); } return c; }
  if (eik) { const l = await prisma.company.findMany({ where: { eik }, select: { id: true, name: true } }); if (l.length !== 1) { console.error(`Очаквах 1 фирма с ЕИК=${eik}, намерени ${l.length}.`); process.exit(1); } return l[0]; }
  const l = await prisma.company.findMany({ where: { name: { contains: "SEM INTERNATIONAL", mode: "insensitive" } }, select: { id: true, name: true } });
  if (l.length !== 1) { console.error(`Име „SEM INTERNATIONAL" даде ${l.length} съвпадения — подайте --sem-id или --sem-eik.`); process.exit(1); }
  return l[0];
}

function plan(entry, existing) {
  const eNorm = normEikMk(entry.eik);
  const nName = normName(entry.name);
  let cands = eNorm ? existing.filter((c) => normEikMk(c.eik) === eNorm) : existing.filter((c) => normName(c.name) === nName);
  let matchReason = eNorm ? "EIK" : "name";
  if (eNorm && cands.length === 0) { const byName = existing.filter((c) => normName(c.name) === nName); if (byName.length) { cands = byName; matchReason = "name"; } }
  if (cands.length > 1) return { action: "AMBIGUOUS", matchReason: "ambiguous", client: null, changes: [], warnings: [`${cands.length} съвпадения`] };
  if (cands.length === 0) {
    const changes = [["name", entry.name], ["eik", entry.eik], ["address", entry.regAddress], ["baseAddress", entry.baseAddress], ["city", entry.city], ["country", entry.country]].filter(([, v]) => nz(v));
    return { action: "CREATE", matchReason: "NEW", client: null, changes, warnings: [] };
  }
  const c = cands[0]; const changes = []; const warnings = [];
  // ТОЗИ batch: единственият write за съществуващ клиент е baseAddress (§1/§9). Другите
  // полета НЕ се пишат — дори празни; различията са само warning (§2).
  if (nz(entry.baseAddress) && diff(c.baseAddress, entry.baseAddress)) changes.push(["baseAddress", entry.baseAddress]);
  if (nz(entry.regAddress) && nz(c.address) && diff(c.address, entry.regAddress)) warnings.push(`registration address differs (current „${nz(c.address)}") — запазен`);
  if (nz(entry.city) && nz(c.city) && diff(c.city, entry.city)) warnings.push(`city differs (current „${nz(c.city)}") — запазен`);
  if (nz(entry.name) && normName(c.name) !== nName) warnings.push(`name differs (current „${nz(c.name)}") — запазено`);
  if (nz(entry.eik) && nz(c.eik) && normEikMk(c.eik) !== eNorm) warnings.push(`EIK differs (current „${nz(c.eik)}" ≠ „${entry.eik}") — MANUAL_REVIEW, запазен`);
  const action = changes.length ? "BASE_ADDRESS_UPDATE" : "NO_CHANGE";
  return { action, matchReason, client: c, changes, warnings };
}

async function main() {
  const sem = await resolveSem();
  const existing = await prisma.client.findMany({ where: { companyId: sem.id }, select: { id: true, name: true, eik: true, address: true, baseAddress: true, city: true, country: true } });
  console.log(`\n${APPLY ? "APPLY" : "DRY-RUN"} — logistics client base-address update`);
  console.log(`  SEM: ${sem.name} (${sem.id}) — съществуващи клиенти: ${existing.length}\n`);

  const summary = { CREATE: 0, BASE_ADDRESS_UPDATE: 0, NO_CHANGE: 0, AMBIGUOUS: 0 };
  let manualReviewCount = 0;
  for (const entry of DATASET) {
    const p = plan(entry, existing);
    summary[p.action]++;
    if (p.warnings.length && p.action !== "AMBIGUOUS") manualReviewCount++;
    console.log(`CLIENT: ${entry.name}`);
    console.log(`  MATCH: ${p.matchReason}${p.client ? `  CANONICAL_CLIENT_ID: ${p.client.id}` : ""}`);
    if (p.client) {
      console.log(`  CURRENT_NAME: ${p.client.name}    TARGET_NAME: ${entry.name}`);
      console.log(`  CURRENT_EIK: ${p.client.eik ?? "—"}    TARGET_EIK: ${entry.eik ?? "—"}`);
      console.log(`  CURRENT_REGISTRATION_ADDRESS: ${p.client.address ?? "—"}`);
      console.log(`  TARGET_REGISTRATION_ADDRESS:  ${entry.regAddress ?? "—"}`);
      console.log(`  CURRENT_BASE_ADDRESS: ${p.client.baseAddress ?? "—"}`);
      console.log(`  TARGET_BASE_ADDRESS:  ${entry.baseAddress ?? "—"}`);
    } else if (p.action === "CREATE") {
      console.log(`  CREATE UNDER COMPANY: ${sem.name} (${sem.id})`);
      console.log(`  TARGET_REGISTRATION_ADDRESS: ${entry.regAddress ?? "—"}    TARGET_BASE_ADDRESS: ${entry.baseAddress ?? "—"}`);
    }
    if (entry.mb) console.log(`  NOTE: M.B. ${entry.mb} — няма поле в Client; докладва се, не се записва.`);
    if (p.warnings.length) { console.log(`  ${p.action === "AMBIGUOUS" ? "AMBIGUOUS" : "MANUAL_REVIEW"} WARNINGS:`); for (const w of p.warnings) console.log(`    - ${w}`); }
    console.log(`  ACTION: ${p.action}${p.changes.length ? `  (${p.changes.map(([f]) => f).join(", ")})` : ""}`);

    if (!APPLY) continue;
    if (p.action === "CREATE") {
      // duplicate guard преди create (§12)
      const dupe = existing.find((c) => (normEikMk(entry.eik) && normEikMk(c.eik) === normEikMk(entry.eik)) || (!normEikMk(entry.eik) && normName(c.name) === normName(entry.name)));
      if (dupe) { console.log("    ↷ пропуснат create (намерен дубликат при повторна проверка)"); continue; }
      const created = await prisma.client.create({ data: { companyId: sem.id, name: entry.name, eik: entry.eik ?? null, address: entry.regAddress ?? null, baseAddress: entry.baseAddress ?? null, city: entry.city ?? null, country: entry.country ?? null }, select: { id: true, name: true, eik: true, address: true, baseAddress: true, city: true, country: true } });
      existing.push(created);
      console.log(`    ✓ created ${created.id}`);
    } else if (p.action === "BASE_ADDRESS_UPDATE") {
      const data = Object.fromEntries(p.changes);
      await prisma.client.update({ where: { id: p.client.id }, data });
      Object.assign(p.client, data);
      console.log(`    ✓ updated (${Object.keys(data).join(", ")})`);
    }
  }
  console.log(`\nОбобщение: ${JSON.stringify(summary)}  MANUAL_REVIEW: ${manualReviewCount}`);
  if (!APPLY) console.log("DRY-RUN — нищо не е променяно. Пуснете с --apply.");
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
