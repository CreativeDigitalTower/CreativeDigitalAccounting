// Еднократна БЕЗОПАСНА процедура за попълване на липсващия Client.city в клиентските досиета
// на избрана фирма (логистика). Разпознава града от адресните полета (виж scripts/lib/cityParse).
//
// DRY-RUN по подразбиране (нищо не се записва): генерира CSV отчет за ръчен преглед.
// APPLY само с одобрен CSV: пише единствено одобрените редове, само ако city е още празно,
// само за правилната фирма, idempotent, без да пипа други полета.
//
//   DRY-RUN:
//     node --env-file=.env scripts/reconcile-logistics-client-cities.mjs --company <companyId>
//       [--out scripts/data/client-cities-<companyId>.csv]
//   APPLY (след ръчно одобрение на CSV, с колона Action=FILL):
//     node --env-file=.env scripts/reconcile-logistics-client-cities.mjs --company <companyId> \
//       --apply --approved-file scripts/data/approved-client-cities.csv
import fs from "node:fs";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { suggestCity } from "./lib/cityParse.mjs";

if (!process.env.DATABASE_URL) { console.error("DATABASE_URL липсва."); process.exit(1); }
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

const APPLY = process.argv.includes("--apply");
const arg = (f) => { const i = process.argv.indexOf(f); return i >= 0 ? process.argv[i + 1] : null; };
const companyId = arg("--company");
const approvedFile = arg("--approved-file");
const outFile = arg("--out");

const csvCell = (v) => { const s = (v ?? "").toString(); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };

// Минимален CSV парсър (поддържа кавички/запетаи в клетки).
function parseCsv(text) {
  const rows = []; let row = [], cur = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; }
    else if (c === '"') q = true;
    else if (c === ",") { row.push(cur); cur = ""; }
    else if (c === "\n") { row.push(cur); rows.push(row); row = []; cur = ""; }
    else if (c === "\r") { /* ignore */ }
    else cur += c;
  }
  if (cur !== "" || row.length) { row.push(cur); rows.push(row); }
  return rows.filter((r) => r.some((x) => x.trim() !== ""));
}

async function main() {
  if (!companyId) { console.error("Задължителен --company <companyId>."); process.exit(1); }
  const company = await prisma.company.findUnique({ where: { id: companyId }, select: { id: true, name: true } });
  if (!company) { console.error("Фирмата не е намерена:", companyId); process.exit(1); }

  if (APPLY) return applyMode(company);

  // ── DRY-RUN: отчет ──
  const clients = await prisma.client.findMany({
    where: { companyId, archivedAt: null },
    select: { id: true, name: true, eik: true, country: true, city: true, address: true, baseAddress: true },
    orderBy: { name: "asc" },
  });

  const header = ["Client ID", "Client Name", "Registration Number", "Country", "Current City", "Registration Address", "Base Address", "Suggested City", "Confidence", "Reason", "Action"];
  const lines = [header.map(csvCell).join(",")];
  const counts = { HIGH: 0, MEDIUM: 0, LOW: 0, UNRESOLVED: 0, alreadyFilled: 0 };

  for (const c of clients) {
    if (c.city && c.city.trim()) { counts.alreadyFilled++; continue; } // има град → пропускаме
    const s = suggestCity(c.address, c.baseAddress);
    counts[s.confidence]++;
    // Action: само HIGH → FILL (кандидат за одобрение); MEDIUM → REVIEW; иначе SKIP.
    const action = s.confidence === "HIGH" ? "FILL" : s.confidence === "MEDIUM" ? "REVIEW" : "SKIP";
    lines.push([c.id, c.name, c.eik ?? "", c.country ?? "", c.city ?? "", c.address ?? "", c.baseAddress ?? "", s.city, s.confidence, s.reason, action].map(csvCell).join(","));
  }

  const out = outFile || `scripts/data/client-cities-${companyId}.csv`;
  fs.writeFileSync(out, lines.join("\n") + "\n", "utf-8");

  console.log(`\nDRY-RUN · reconcile logistics client cities · ${company.name}\n`);
  console.log("  Clients scanned:        ", clients.length);
  console.log("  Already have city:      ", counts.alreadyFilled);
  console.log("  HIGH (→ FILL кандидати):", counts.HIGH);
  console.log("  MEDIUM (→ REVIEW):      ", counts.MEDIUM);
  console.log("  LOW:                    ", counts.LOW);
  console.log("  UNRESOLVED:             ", counts.UNRESOLVED);
  console.log(`\nОтчет: ${out}`);
  console.log("Прегледай/редактирай CSV-то, остави Action=FILL само за одобрените, после пусни --apply --approved-file <csv>.\n");
  console.log("ВНИМАНИЕ: градът се предлага от адреса — ВИНАГИ преглеждай преди --apply. Нищо не е записано.\n");
}

async function applyMode(company) {
  if (!approvedFile) { console.error("--apply изисква --approved-file <csv>."); process.exit(1); }
  if (!fs.existsSync(approvedFile)) { console.error("Файлът не е намерен:", approvedFile); process.exit(1); }
  const rows = parseCsv(fs.readFileSync(approvedFile, "utf-8"));
  const head = rows.shift()?.map((h) => h.trim()) ?? [];
  const col = (name) => head.indexOf(name);
  const [iId, iSug, iAct] = [col("Client ID"), col("Suggested City"), col("Action")];
  if (iId < 0 || iSug < 0 || iAct < 0) { console.error("CSV трябва да има колони: Client ID, Suggested City, Action."); process.exit(1); }

  let applied = 0, skippedNotFill = 0, skippedFilled = 0, skippedChanged = 0, errors = 0;
  console.log(`\nAPPLY · reconcile logistics client cities · ${company.name}\n`);
  for (const r of rows) {
    const id = (r[iId] ?? "").trim(); const suggested = (r[iSug] ?? "").trim(); const action = (r[iAct] ?? "").trim().toUpperCase();
    if (!id) continue;
    if (action !== "FILL") { skippedNotFill++; continue; }
    if (!suggested) { skippedChanged++; console.log(`  SKIP ${id}: празен Suggested City`); continue; }
    // Company-scoped + idempotent: пише само ако city е още празно (§7/§10).
    const c = await prisma.client.findFirst({ where: { id, companyId: company.id }, select: { id: true, name: true, city: true } });
    if (!c) { errors++; console.log(`  SKIP ${id}: клиентът не е намерен за тази фирма (IDOR/невалиден ID)`); continue; }
    if (c.city && c.city.trim()) { skippedFilled++; console.log(`  SKIP ${id} (${c.name}): вече има град „${c.city}"`); continue; }
    try {
      const res = await prisma.client.updateMany({ where: { id, companyId: company.id, city: null }, data: { city: suggested } });
      if (res.count === 1) { applied++; console.log(`  FILL ${id} (${c.name}) → „${suggested}"`); }
      else { skippedChanged++; console.log(`  SKIP ${id}: промени се след dry-run (city вече не е null)`); }
    } catch (e) { errors++; console.error(`  ! ${id}:`, e.message); }
  }
  console.log("\nSummary");
  console.log("  Applied (city filled):", applied);
  console.log("  Skipped (not FILL):   ", skippedNotFill);
  console.log("  Skipped (already set):", skippedFilled);
  console.log("  Skipped (changed/empty):", skippedChanged);
  console.log("  Errors:               ", errors);
  console.log("\nAPPLIED. Само одобрените (Action=FILL) и само празни градове бяха попълнени.\n");
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
