/**
 * Чиста агрегация за логистичните отчети (§37) — без DB, тестируемо изолирано.
 * Обем BULK vs BAGS, натовареност по влекач/превозвач, брой доставки, средно кол.
 * Нищо не се изобретява: където данните липсват (превозвач/капацитет), се отчита „—".
 */
import { Prisma } from "@prisma/client";
import { normalizeProductKey } from "@/lib/logistics/normalize";
import { CEMENT_PRODUCTS } from "@/lib/logistics/cementFleet.data";
import type { CargoMode } from "@/lib/logistics/fleet";

const D = (v: number | string) => new Prisma.Decimal(v);
const t3 = (d: Prisma.Decimal) => d.toDecimalPlaces(3).toNumber();

/** Индекс продукт→вид товар от каноничния списък (§6). Построява се веднъж. */
const PRODUCT_MODE = new Map<string, CargoMode>();
for (const name of CEMENT_PRODUCTS.bulk) PRODUCT_MODE.set(normalizeProductKey(name), "bulk");
for (const name of CEMENT_PRODUCTS.bags) PRODUCT_MODE.set(normalizeProductKey(name), "bags");

/** Класифицира продукт като насипен/в торби по каноничния списък. "" ако е непознат. */
export function classifyCargoByProduct(productName: string | null | undefined): CargoMode | "" {
  return PRODUCT_MODE.get(normalizeProductKey(productName)) ?? "";
}

/** Един ред испратница за целите на отчета. */
export type ReportSet = {
  truckVehicleId: string | null;
  truckReg: string | null;
  product: string | null;
  quantity: number | null;
};

/** Метаданни за влекач (от конфигурациите): превозвач(и), капацитет. */
export type TruckMeta = { carrierName: string | null; maxPayloadTons: number | null };

function accumulate(map: Map<string, { key: string; label: string; deliveries: number; totalTons: Prisma.Decimal }>, key: string, label: string, qty: number | null) {
  const cur = map.get(key) ?? { key, label, deliveries: 0, totalTons: D(0) };
  cur.deliveries += 1;
  if (qty != null) cur.totalTons = cur.totalTons.plus(qty);
  map.set(key, cur);
}

/** Обем по вид товар: BULK vs BAGS vs неопределен (§4/§37). */
export function volumeByCargo(sets: ReportSet[]) {
  const acc = { bulk: D(0), bags: D(0), unknown: D(0) };
  const cnt = { bulk: 0, bags: 0, unknown: 0 };
  for (const s of sets) {
    const mode = classifyCargoByProduct(s.product) || "unknown";
    acc[mode] = acc[mode].plus(s.quantity ?? 0);
    cnt[mode] += 1;
  }
  return {
    bulk: { totalTons: t3(acc.bulk), deliveries: cnt.bulk },
    bags: { totalTons: t3(acc.bags), deliveries: cnt.bags },
    unknown: { totalTons: t3(acc.unknown), deliveries: cnt.unknown },
  };
}

/** Агрегация по продукт: брой испратници + общо количество. */
export function byProduct(sets: ReportSet[]) {
  const m = new Map<string, { key: string; label: string; deliveries: number; totalTons: Prisma.Decimal }>();
  for (const s of sets) accumulate(m, s.product ?? "—", s.product ?? "—", s.quantity);
  return [...m.values()].map((r) => ({ label: r.label, deliveries: r.deliveries, totalTons: t3(r.totalTons) }))
    .sort((a, b) => b.totalTons - a.totalTons);
}

/**
 * Агрегация по влекач: брой курсове, общо/средно количество, макс. товар и
 * натовареност (средно кол. / макс. товар, %). Натовареност е null, ако няма капацитет.
 */
export function byTruck(sets: ReportSet[], meta: Map<string, TruckMeta>) {
  const m = new Map<string, { key: string; label: string; deliveries: number; totalTons: Prisma.Decimal }>();
  for (const s of sets) {
    const key = s.truckVehicleId ?? s.truckReg ?? "—";
    accumulate(m, key, s.truckReg ?? "—", s.quantity);
  }
  return [...m.values()].map((r) => {
    const info = meta.get(r.key);
    const avg = r.deliveries ? r.totalTons.div(r.deliveries) : D(0);
    const maxLoad = info?.maxPayloadTons ?? null;
    const utilization = maxLoad && maxLoad > 0 ? Math.round(avg.div(maxLoad).mul(100).toNumber()) : null;
    return {
      label: r.label,
      carrierName: info?.carrierName ?? null,
      deliveries: r.deliveries,
      totalTons: t3(r.totalTons),
      avgTons: t3(avg),
      maxPayloadTons: maxLoad,
      utilizationPct: utilization,
    };
  }).sort((a, b) => b.totalTons - a.totalTons);
}

/** Агрегация по превозвач (през влекача). Влекачи без еднозначен превозвач → „—". */
export function byCarrier(sets: ReportSet[], meta: Map<string, TruckMeta>) {
  const m = new Map<string, { key: string; label: string; deliveries: number; totalTons: Prisma.Decimal }>();
  for (const s of sets) {
    const carrier = (s.truckVehicleId && meta.get(s.truckVehicleId)?.carrierName) || "—";
    accumulate(m, carrier, carrier, s.quantity);
  }
  return [...m.values()].map((r) => ({ label: r.label, deliveries: r.deliveries, totalTons: t3(r.totalTons) }))
    .sort((a, b) => b.totalTons - a.totalTons);
}
