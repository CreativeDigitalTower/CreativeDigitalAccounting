// ─────────────────────────────────────────────────────────────────────────
// Централизирано изчисляване на РАБОТНИ дни за отпуски и отсъствия.
//
// Правило: платеният отпуск и отсъствията в „работни дни" се измерват само по
// реалните работни дни по графика на служителя — БЕЗ събота/неделя, официалните
// празници и индивидуалните неработни дни. Периодът е включително (start..end).
//
// Работи изцяло с date-only (YYYY-MM-DD) — без UTC/DST измествания с ±1 ден.
// Един източник, ползван от API, справките, portal-а и payroll.
// ─────────────────────────────────────────────────────────────────────────

import { bgHolidaysForYear, bgHolidayName } from "./holidays";

export type CountMode = "WORKING_DAYS" | "CALENDAR_DAYS" | "HOURS";

/** Работен график: кои дни от седмицата са работни (0=неделя … 6=събота). */
export type WorkSchedule = { workingWeekdays: number[] };
/** Стандартна петдневна седмица (понеделник–петък). */
export const DEFAULT_SCHEDULE: WorkSchedule = { workingWeekdays: [1, 2, 3, 4, 5] };

export type DayInfo = { date: string; weekday: number; isWorking: boolean; reason: "working" | "weekend" | "holiday" | "off"; holidayName?: string };
export type WorkingDaysBreakdown = {
  calendarDays: number;
  workingDays: number;
  weekendDays: number;
  holidayDays: number;
  offDays: number; // индивидуални неработни дни (по график, извън уикенд)
  valid: boolean;
  error?: string;
  days: DayInfo[];
};

/** Нормализира вход (Date | "YYYY-MM-DD") до date-only низ по календарни части. */
export function toYmd(input: Date | string): string {
  if (typeof input === "string") {
    const m = input.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return `${m[1]}-${m[2]}-${m[3]}`;
    input = new Date(input);
  }
  // Датите за отпуск се съхраняват като UTC полунощ → четем UTC частите.
  const y = input.getUTCFullYear(), mo = input.getUTCMonth() + 1, d = input.getUTCDate();
  return `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function parseYmd(ymd: string): { y: number; m: number; d: number } | null {
  const m = ymd.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  return { y: Number(m[1]), m: Number(m[2]), d: Number(m[3]) };
}
/** Ден от седмицата за date-only (без timezone): 0=неделя … 6=събота. */
function weekdayOf(ymd: string): number {
  const p = parseYmd(ymd)!;
  return new Date(Date.UTC(p.y, p.m - 1, p.d)).getUTCDay();
}
function addDays(ymd: string, n: number): string {
  const p = parseYmd(ymd)!;
  const dt = new Date(Date.UTC(p.y, p.m - 1, p.d));
  dt.setUTCDate(dt.getUTCDate() + n);
  return dt.toISOString().slice(0, 10);
}

export type WorkingDaysOptions = {
  schedule?: WorkSchedule;
  /** Държава за официалните празници (засега "BG"). */
  country?: string;
  /** Изключване на официалните празници (по подразбиране да). */
  observeHolidays?: boolean;
  /** Допълнителни фирмени/индивидуални неработни дни (YYYY-MM-DD). */
  extraOffDays?: string[];
};

/**
 * Изчислява работните дни между две дати (включително), с пълна разбивка.
 * НЕ използва просто endDate − startDate.
 */
export function calculateWorkingDays(startInput: Date | string, endInput: Date | string, opts: WorkingDaysOptions = {}): WorkingDaysBreakdown {
  const start = toYmd(startInput);
  const end = toYmd(endInput);
  const schedule = opts.schedule ?? DEFAULT_SCHEDULE;
  const observe = opts.observeHolidays ?? true;
  const extraOff = new Set(opts.extraOffDays ?? []);
  const empty: WorkingDaysBreakdown = { calendarDays: 0, workingDays: 0, weekendDays: 0, holidayDays: 0, offDays: 0, valid: false, days: [] };

  if (!parseYmd(start) || !parseYmd(end)) return { ...empty, error: "invalid_dates" };
  if (end < start) return { ...empty, error: "end_before_start" };

  // Празници за всички засегнати години (обхватът може да пресича Нова година).
  const years = new Set<number>();
  for (let cur = start; cur <= end; cur = addDays(cur, 1)) years.add(Number(cur.slice(0, 4)));
  const holidays = new Map<string, string>();
  if (observe && (opts.country ?? "BG") === "BG") {
    for (const y of years) for (const [date, name] of bgHolidaysForYear(y)) holidays.set(date, name);
  }

  const days: DayInfo[] = [];
  let calendarDays = 0, workingDays = 0, weekendDays = 0, holidayDays = 0, offDays = 0;

  for (let cur = start; cur <= end; cur = addDays(cur, 1)) {
    calendarDays++;
    const wd = weekdayOf(cur);
    const isWeekendBySchedule = !schedule.workingWeekdays.includes(wd);
    const isHoliday = holidays.has(cur);
    const isExtraOff = extraOff.has(cur);
    // Приоритет на причината: празник → уикенд (извън графика) → инд. неработен → работен.
    if (isHoliday) { holidayDays++; days.push({ date: cur, weekday: wd, isWorking: false, reason: "holiday", holidayName: holidays.get(cur) }); }
    else if (isWeekendBySchedule) { weekendDays++; days.push({ date: cur, weekday: wd, isWorking: false, reason: "weekend" }); }
    else if (isExtraOff) { offDays++; days.push({ date: cur, weekday: wd, isWorking: false, reason: "off" }); }
    else { workingDays++; days.push({ date: cur, weekday: wd, isWorking: true, reason: "working" }); }
  }

  return { calendarDays, workingDays, weekendDays, holidayDays, offDays, valid: true, days };
}

// ─── Видове отсъствия → как се броят ───
export const LEAVE_COUNT_MODE: Record<string, CountMode> = {
  leave: "WORKING_DAYS",   // платен годишен отпуск — само работни дни
  unpaid: "WORKING_DAYS",  // неплатен отпуск — по работни дни
  sick: "WORKING_DAYS",    // болничен — отсъствие от графика по работни дни
  other: "WORKING_DAYS",   // друг вид — по работни дни (по подразбиране)
};

export function countModeFor(type: string): CountMode {
  return LEAVE_COUNT_MODE[type] ?? "WORKING_DAYS";
}

/**
 * Изчислява дните, които се приспадат за конкретен вид отсъствие.
 * WORKING_DAYS → работни дни; CALENDAR_DAYS → календарни; HOURS → извън обхвата тук.
 */
export function calculateLeaveDays(type: string, startInput: Date | string, endInput: Date | string, opts: WorkingDaysOptions = {}): WorkingDaysBreakdown {
  const b = calculateWorkingDays(startInput, endInput, opts);
  return b;
}

/** Локализирано име на официален празник (за tooltip/breakdown). */
export { bgHolidayName };
