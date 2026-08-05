// ─────────────────────────────────────────────────────────────────────────
// Централен календар на официалните празници (по държава и година).
//
// България: фиксирани дати по чл. 154 КТ + подвижните великденски дни
// (православна Пасха) + компенсиране (чл. 154, ал. 2 КТ): когато официален
// празник (извън Великден) съвпадне със събота/неделя, първият/вторият работен
// ден след него е неработен.
//
// Архитектурата позволява добавяне на други държави/години и фирмени изключения
// без промяна на потребяващия код.
// ─────────────────────────────────────────────────────────────────────────

const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`;

// Фиксирани официални празници (месец, ден, име).
const BG_FIXED: { m: number; d: number; name: string }[] = [
  { m: 1, d: 1, name: "Нова година" },
  { m: 3, d: 3, name: "Ден на Освобождението" },
  { m: 5, d: 1, name: "Ден на труда" },
  { m: 5, d: 6, name: "Гергьовден, Ден на храбростта и Българската армия" },
  { m: 5, d: 24, name: "Ден на българската просвета и култура и на славянската писменост" },
  { m: 9, d: 6, name: "Ден на Съединението" },
  { m: 9, d: 22, name: "Ден на Независимостта" },
  { m: 12, d: 24, name: "Бъдни вечер" },
  { m: 12, d: 25, name: "Рождество Христово" },
  { m: 12, d: 26, name: "Рождество Христово" },
];

/** Дата на православния Великден (неделя, григориански календар) за дадена година. */
function orthodoxEasterSunday(year: number): { y: number; m: number; d: number } {
  // Алгоритъм на Meeus за юлианска Пасха + 13 дни за григорианския календар (1900–2099).
  const a = year % 4, b = year % 7, c = year % 19;
  const d = (19 * c + 15) % 30;
  const e = (2 * a + 4 * b - d + 34) % 7;
  const month = Math.floor((d + e + 114) / 31); // 3=март, 4=април
  const day = ((d + e + 114) % 31) + 1;
  const dt = new Date(Date.UTC(year, month - 1, day));
  dt.setUTCDate(dt.getUTCDate() + 13);
  return { y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1, d: dt.getUTCDate() };
}

function isWeekendYmd(dateStr: string): boolean {
  const [y, m, d] = dateStr.split("-").map(Number);
  const wd = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return wd === 0 || wd === 6;
}
function nextDay(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + 1);
  return dt.toISOString().slice(0, 10);
}

/**
 * Официалните празници за България за дадена година → Map<YYYY-MM-DD, име>.
 * Включва подвижните великденски дни и компенсиращите дни за фиксираните
 * празници, паднали в събота/неделя (чл. 154, ал. 2 КТ).
 */
export function bgHolidaysForYear(year: number): Map<string, string> {
  const map = new Map<string, string>();

  // 1) Фиксирани.
  for (const h of BG_FIXED) map.set(ymd(year, h.m, h.d), h.name);

  // 2) Великденски дни: Разпети петък, Велика събота, Великден (неделя) и
  //    Светли понеделник. (Съботата/неделята така или иначе са почивни.)
  const es = orthodoxEasterSunday(year);
  const easter = new Date(Date.UTC(es.y, es.m - 1, es.d));
  const goodFriday = new Date(easter); goodFriday.setUTCDate(easter.getUTCDate() - 2);
  const holySaturday = new Date(easter); holySaturday.setUTCDate(easter.getUTCDate() - 1);
  const easterMonday = new Date(easter); easterMonday.setUTCDate(easter.getUTCDate() + 1);
  map.set(goodFriday.toISOString().slice(0, 10), "Разпети петък");
  map.set(holySaturday.toISOString().slice(0, 10), "Велика събота");
  map.set(easter.toISOString().slice(0, 10), "Великден");
  map.set(easterMonday.toISOString().slice(0, 10), "Велики понеделник");

  // 3) Компенсиране (чл. 154, ал. 2 КТ): фиксиран празник в събота/неделя →
  //    следващият работен ден (или дни) е неработен. Великденските дни се
  //    изключват от това правило.
  const fixedDates = BG_FIXED.map((h) => ymd(year, h.m, h.d)).filter(isWeekendYmd);
  for (const fd of fixedDates) {
    let cand = nextDay(fd);
    // прескачаме дни, които вече са празник/почивен, докато стигнем работен ден
    while (isWeekendYmd(cand) || map.has(cand)) cand = nextDay(cand);
    map.set(cand, "Компенсиращ почивен ден");
  }

  return map;
}

/** Име на празника за конкретна дата (или null). */
export function bgHolidayName(dateStr: string): string | null {
  const year = Number(dateStr.slice(0, 4));
  return bgHolidaysForYear(year).get(dateStr) ?? null;
}
