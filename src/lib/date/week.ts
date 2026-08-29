/**
 * Календарни помощни функции с ПОНЕДЕЛНИК като първи ден от седмицата (§18/§22).
 * Чиста логика (без UI/locale библиотека) — тествана изолирано и споделена от date
 * picker-ите. „Понеделник-based" важи и за подредбата на колоните, и за изчисленията.
 */

export const WEEK_STARTS_ON = 1; // 0=неделя, 1=понеделник (§20)

/**
 * Локална (timezone-safe) ISO дата „yyyy-mm-dd" от местните компоненти на деня — НЕ
 * `toISOString().slice(0,10)`, който около полунощ дава предходен/следващ ден за BG/MK
 * часовия пояс. Ползва се за default стойности в date input-ите.
 */
export function toISODateLocal(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

/** Днешната локална дата като „yyyy-mm-dd". */
export function todayISODate(): string {
  return toISODateLocal(new Date());
}

// Ключове в реда понеделник → неделя. Етикетите идват от i18n (виж calendar.* ключове).
export const WEEKDAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
export type WeekdayKey = (typeof WEEKDAY_KEYS)[number];

/** Отместване на дадена дата спрямо понеделник (Пн=0 … Нд=6). */
export function mondayIndex(date: Date): number {
  return (date.getDay() + 6) % 7;
}

export type MonthCell = { iso: string; day: number; inMonth: boolean };

/**
 * Матрица на месеца, подредена по седмици, всяка започваща от ПОНЕДЕЛНИК (§18/§28).
 * Води до пълни седмици (запълва с дни от съседните месеци, маркирани inMonth=false).
 */
export function buildMonthMatrix(year: number, monthIndex: number): MonthCell[][] {
  const first = new Date(year, monthIndex, 1);
  const start = new Date(year, monthIndex, 1 - mondayIndex(first)); // назад до понеделника
  const weeks: MonthCell[][] = [];
  const cursor = new Date(start);
  for (let w = 0; w < 6; w++) {
    const row: MonthCell[] = [];
    for (let d = 0; d < 7; d++) {
      const y = cursor.getFullYear(), m = cursor.getMonth(), day = cursor.getDate();
      const iso = `${y}-${String(m + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      row.push({ iso, day, inMonth: m === monthIndex });
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push(row);
    // Спираме, ако следващата седмица е изцяло от следващия месец.
    if (cursor.getMonth() !== monthIndex && cursor > new Date(year, monthIndex + 1, 0)) break;
  }
  return weeks;
}
