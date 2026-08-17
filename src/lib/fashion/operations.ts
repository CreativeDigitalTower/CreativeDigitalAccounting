/**
 * Чиста логика за технологични операции + производствено време (§9, §10) — без DB.
 */
import { Prisma } from "@prisma/client";

const D = (v: number | string) => new Prisma.Decimal(v);

/** Категории операции по подразбиране (§9). Редактируеми/разширяеми per company. */
export const DEFAULT_OPERATION_CATEGORIES: { code: string; name: string }[] = [
  { code: "straight", name: "Права машина" },
  { code: "overlock", name: "Оверлог" },
  { code: "coverstitch", name: "Покривна" },
  { code: "flatlock", name: "Flatlock" },
  { code: "bartack", name: "Bartack" },
  { code: "embroidery", name: "Бродерия" },
  { code: "buttonhole", name: "Илик" },
  { code: "button", name: "Пришиване на копче" },
  { code: "zipper", name: "Цип" },
  { code: "elastic", name: "Ластик" },
  { code: "binding", name: "Кант" },
  { code: "fusing", name: "Подлепване" },
  { code: "ironing", name: "Гладене" },
  { code: "manual", name: "Ръчна операция" },
  { code: "control", name: "Контрол" },
  { code: "packing", name: "Опаковане" },
  { code: "other", name: "Други" },
];

export type OpLike = { expectedMinutes: number; categoryLabel?: string | null; machineLabel?: string | null };

/** Общо стандартно време за 1 дреха (минути), decimal-safe. */
export function totalMinutes(ops: OpLike[]): number {
  return ops.reduce<Prisma.Decimal>((s, o) => s.plus(o.expectedMinutes || 0), D(0)).toDecimalPlaces(2).toNumber();
}

/** Минути в часове (за labor cost), 4 знака. */
export function minutesToHours(min: number): number {
  return D(min).div(60).toDecimalPlaces(4).toNumber();
}

/** Групиране на времето по ключ (категория/машина). Връща подредени по време низходящо. */
export function minutesByKey(ops: OpLike[], key: (o: OpLike) => string): { key: string; minutes: number; count: number }[] {
  const map = new Map<string, { minutes: Prisma.Decimal; count: number }>();
  for (const o of ops) {
    const k = key(o) || "—";
    const cur = map.get(k) ?? { minutes: D(0), count: 0 };
    cur.minutes = cur.minutes.plus(o.expectedMinutes || 0);
    cur.count += 1;
    map.set(k, cur);
  }
  return [...map.entries()]
    .map(([key, v]) => ({ key, minutes: v.minutes.toDecimalPlaces(2).toNumber(), count: v.count }))
    .sort((a, b) => b.minutes - a.minutes);
}

export const minutesByCategory = (ops: OpLike[]) => minutesByKey(ops, (o) => o.categoryLabel ?? "—");
export const minutesByMachine = (ops: OpLike[]) => minutesByKey(ops, (o) => o.machineLabel ?? "—");
