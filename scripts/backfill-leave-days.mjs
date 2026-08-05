// Преизчислява EmployeeLeave.days от КАЛЕНДАРНИ на РАБОТНИ дни (без уикенди и
// официални празници) — за записи, създадени преди корекцията.
//
// Употреба:
//   node scripts/backfill-leave-days.mjs           → DRY-RUN (само отчет, нищо не пише)
//   node scripts/backfill-leave-days.mjs --apply   → записва новите стойности
//
// Безопасно: dry-run по подразбиране. Печата старо → ново за всеки засегнат запис.
// Логиката е огледало на src/lib/workingDays.ts + src/lib/holidays.ts.
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });
const APPLY = process.argv.includes("--apply");

const pad = (n) => String(n).padStart(2, "0");
const ymd = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`;
const toYmd = (dt) => `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
const weekday = (s) => { const [y, m, d] = s.split("-").map(Number); return new Date(Date.UTC(y, m - 1, d)).getUTCDay(); };
const addDays = (s, n) => { const [y, m, d] = s.split("-").map(Number); const dt = new Date(Date.UTC(y, m - 1, d)); dt.setUTCDate(dt.getUTCDate() + n); return dt.toISOString().slice(0, 10); };
const isWeekend = (s) => { const w = weekday(s); return w === 0 || w === 6; };

const FIXED = [[1,1],[3,3],[5,1],[5,6],[5,24],[9,6],[9,22],[12,24],[12,25],[12,26]];
function orthodoxEaster(year) {
  const a = year % 4, b = year % 7, c = year % 19;
  const d = (19 * c + 15) % 30, e = (2 * a + 4 * b - d + 34) % 7;
  const month = Math.floor((d + e + 114) / 31), day = ((d + e + 114) % 31) + 1;
  const dt = new Date(Date.UTC(year, month - 1, day)); dt.setUTCDate(dt.getUTCDate() + 13); return dt;
}
function holidays(year) {
  const set = new Set(FIXED.map(([m, d]) => ymd(year, m, d)));
  const easter = orthodoxEaster(year);
  for (const off of [-2, -1, 0, 1]) { const dt = new Date(easter); dt.setUTCDate(easter.getUTCDate() + off); set.add(dt.toISOString().slice(0, 10)); }
  for (const [m, d] of FIXED) { const fd = ymd(year, m, d); if (!isWeekend(fd)) continue; let c = addDays(fd, 1); while (isWeekend(c) || set.has(c)) c = addDays(c, 1); set.add(c); }
  return set;
}
function workingDays(startDt, endDt) {
  const start = toYmd(startDt), end = toYmd(endDt);
  if (end < start) return 0;
  const cache = new Map();
  const hol = (y) => { if (!cache.has(y)) cache.set(y, holidays(y)); return cache.get(y); };
  let n = 0;
  for (let cur = start; cur <= end; cur = addDays(cur, 1)) {
    if (isWeekend(cur)) continue;
    if (hol(Number(cur.slice(0, 4))).has(cur)) continue;
    n++;
  }
  return n;
}

const leaves = await prisma.employeeLeave.findMany({ select: { id: true, employeeId: true, type: true, startDate: true, endDate: true, days: true } });
let changed = 0, same = 0;
for (const l of leaves) {
  const nw = workingDays(l.startDate, l.endDate);
  const old = l.days ?? 0;
  if (nw !== old) {
    changed++;
    console.log(`${APPLY ? "UPDATE" : "DRY"} leave ${l.id} (${l.type}) ${toYmd(l.startDate)}..${toYmd(l.endDate)}: ${old} → ${nw}`);
    if (APPLY) await prisma.employeeLeave.update({ where: { id: l.id }, data: { days: nw } });
  } else same++;
}
console.log(`\nОбщо: ${leaves.length} · за промяна: ${changed} · без промяна: ${same} · режим: ${APPLY ? "APPLY (записано)" : "DRY-RUN (нищо не е записано)"}`);
await prisma.$disconnect();
