/**
 * Агрегиране на курсове/доставки за досие (автомобил или клиент) от вече заредени
 * минимални редове { date, quantity }. Чисти функции — тествани изолирано (§52). Един
 * ExportDocumentSet = един курс/доставка (§2). Количество: 3 десетични (§41).
 */
import { monthKey } from "@/lib/logistics/period";

export type DatedQty = { date: Date | string | null; quantity?: number | null };

const round3 = (n: number) => Math.round(n * 1000) / 1000;
const toDate = (d: Date | string | null): Date | null => {
  if (!d) return null;
  const x = d instanceof Date ? d : new Date(d);
  return isNaN(x.getTime()) ? null : x;
};
const qty = (q: number | null | undefined) => (q && q > 0 ? q : 0);

export type TripSummary = {
  trips: number;
  quantity: number;
  firstTrip: string | null;
  lastTrip: string | null;
  thisMonthTrips: number;
  thisMonthQuantity: number;
};

/** Обобщава редовете: общо курсове/количество, първи/последен, текущ месец. */
export function summarizeTrips(rows: DatedQty[], now: Date = new Date()): TripSummary {
  const dated = rows.map((r) => ({ d: toDate(r.date), q: qty(r.quantity) }));
  const valid = dated.filter((r) => r.d) as { d: Date; q: number }[];
  const sorted = [...valid].sort((a, b) => a.d.getTime() - b.d.getTime());
  const mk = monthKey(now);
  const thisMonth = valid.filter((r) => monthKey(r.d) === mk);
  return {
    trips: rows.length,
    quantity: round3(dated.reduce((s, r) => s + r.q, 0)),
    firstTrip: sorted.length ? sorted[0].d.toISOString() : null,
    lastTrip: sorted.length ? sorted[sorted.length - 1].d.toISOString() : null,
    thisMonthTrips: thisMonth.length,
    thisMonthQuantity: round3(thisMonth.reduce((s, r) => s + r.q, 0)),
  };
}

export type MonthBucket = { month: string; trips: number; quantity: number };

/**
 * Курсове/количество по календарни месеци (§40). Връща последните `months` месеца
 * (включително текущия), нулево-запълнени, най-новият първи.
 */
export function bucketByMonth(rows: DatedQty[], months = 12, now: Date = new Date()): MonthBucket[] {
  const acc = new Map<string, { trips: number; quantity: number }>();
  for (const r of rows) {
    const d = toDate(r.date);
    if (!d) continue;
    const k = monthKey(d);
    const cur = acc.get(k) ?? { trips: 0, quantity: 0 };
    cur.trips += 1;
    cur.quantity = round3(cur.quantity + qty(r.quantity));
    acc.set(k, cur);
  }
  const out: MonthBucket[] = [];
  for (let i = 0; i < months; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const k = monthKey(d);
    const v = acc.get(k) ?? { trips: 0, quantity: 0 };
    out.push({ month: k, trips: v.trips, quantity: v.quantity });
  }
  return out;
}

export type YearBucket = { year: number; trips: number; quantity: number };

/** Курсове/количество по календарни години, най-новата първа. */
export function bucketByYear(rows: DatedQty[]): YearBucket[] {
  const acc = new Map<number, { trips: number; quantity: number }>();
  for (const r of rows) {
    const d = toDate(r.date);
    if (!d) continue;
    const y = d.getFullYear();
    const cur = acc.get(y) ?? { trips: 0, quantity: 0 };
    cur.trips += 1;
    cur.quantity = round3(cur.quantity + qty(r.quantity));
    acc.set(y, cur);
  }
  return [...acc.entries()].map(([year, v]) => ({ year, ...v })).sort((a, b) => b.year - a.year);
}
