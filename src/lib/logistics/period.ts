/**
 * Периодни помощници за аналитиката на логистиката (§39/§40). Един източник за date-math —
 * без дублиране по компонентите. Timezone: локална дата (сървърна), календарни граници.
 */
export const PERIOD_KEYS = [
  "this_month",
  "last_3_months",
  "last_6_months",
  "last_12_months",
  "this_year",
  "all_time",
  "custom",
] as const;
export type PeriodKey = (typeof PERIOD_KEYS)[number];

export function isPeriodKey(x: unknown): x is PeriodKey {
  return typeof x === "string" && (PERIOD_KEYS as readonly string[]).includes(x);
}

export type PeriodRange = { from: Date | null; to: Date | null };

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
const endOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
const monthsAgo = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth() - n, d.getDate(), 0, 0, 0, 0);

/**
 * Разрешава период към { from, to } граници (включващи). `null` = без граница.
 * `custom` ползва from/to (ISO/date низове); липсваща граница остава null.
 */
export function resolvePeriodRange(key: PeriodKey, opts: { now?: Date; from?: string | null; to?: string | null } = {}): PeriodRange {
  const now = opts.now ?? new Date();
  switch (key) {
    case "this_month":
      return { from: startOfMonth(now), to: null };
    case "last_3_months":
      return { from: monthsAgo(now, 3), to: null };
    case "last_6_months":
      return { from: monthsAgo(now, 6), to: null };
    case "last_12_months":
      return { from: monthsAgo(now, 12), to: null };
    case "this_year":
      return { from: new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0), to: null };
    case "all_time":
      return { from: null, to: null };
    case "custom": {
      const from = opts.from ? startOfDay(new Date(opts.from)) : null;
      const to = opts.to ? endOfDay(new Date(opts.to)) : null;
      return { from: from && !isNaN(from.getTime()) ? from : null, to: to && !isNaN(to.getTime()) ? to : null };
    }
  }
}

/** Календарен ключ YYYY-MM по локална дата (§40) — не rolling 30-дневни кофи. */
export function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** Prisma date-филтър от период (за поле като shipmentDate). Празен обект = без филтър. */
export function prismaDateFilter(range: PeriodRange): { gte?: Date; lte?: Date } {
  const f: { gte?: Date; lte?: Date } = {};
  if (range.from) f.gte = range.from;
  if (range.to) f.lte = range.to;
  return f;
}
