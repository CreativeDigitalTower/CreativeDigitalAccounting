/**
 * Аналитика на превозвачите. Чиста, тествана логика — API-то прави aggregation queries и подава
 * готовите данни тук (без N+1).
 *
 * КАНОНИЧНИ ДЕФИНИЦИИ (§18):
 *  - ЕДИН превоз = ЕДИН ExportDocumentSet (deletedAt=null). Документите (Invoice/Dispatch/CMR/
 *    Declaration) са деца на доставката → НЕ се броят отделно (без double counting).
 *  - Количество = ExportDocumentSet.quantity (вече в тонове; НЕ се умножава/дели).
 *  - Дата = shipmentDate (fallback invoiceDate).
 *  - Привързване към превозвач = ТЕКУЩИЯ превозвач на автомобила (truckVehicleId →
 *    VehicleLogisticsProfile.carrierId). ExportDocumentSet НЯМА carrier snapshot, затова това
 *    е операционна атрибуция по текущия master, НЕ гарантирано историческа (§C/§18).
 */

export type PeriodRange = "current_month" | "prev_month" | "last_3m" | "last_6m" | "current_year" | "all" | "custom";

/** Връща { gte, lt } за period филтъра (server-side), или null за „всички периоди". */
export function resolvePeriod(range: string, fromISO?: string | null, toISO?: string | null, now: Date = new Date()): { gte: Date; lt: Date } | null {
  const y = now.getFullYear(), m = now.getMonth();
  const startOfMonth = (yy: number, mm: number) => new Date(yy, mm, 1);
  switch (range) {
    case "current_month": return { gte: startOfMonth(y, m), lt: startOfMonth(y, m + 1) };
    case "prev_month": return { gte: startOfMonth(y, m - 1), lt: startOfMonth(y, m) };
    case "last_3m": return { gte: startOfMonth(y, m - 2), lt: startOfMonth(y, m + 1) };
    case "last_6m": return { gte: startOfMonth(y, m - 5), lt: startOfMonth(y, m + 1) };
    case "current_year": return { gte: new Date(y, 0, 1), lt: new Date(y + 1, 0, 1) };
    case "custom": {
      const gte = fromISO ? new Date(fromISO) : new Date(y, 0, 1);
      const to = toISO ? new Date(toISO) : now;
      const lt = new Date(to); lt.setHours(23, 59, 59, 999);
      return { gte, lt };
    }
    default: return null; // all
  }
}

const round3 = (n: number) => Math.round(n * 1000) / 1000;

export type CarrierLite = { id: string; name: string; active: boolean; eik?: string | null; contact?: string | null; phone?: string | null };
export type VehicleCarrier = { vehicleId: string; carrierId: string | null; active: boolean };
export type TripAgg = { truckVehicleId: string | null; trips: number; quantity: number; lastDelivery: string | null };

export type CarrierRow = CarrierLite & { vehiclesTotal: number; vehiclesActive: number; trips: number; quantity: number; lastDelivery: string | null };
export type CarrierOverview = {
  rows: CarrierRow[];
  kpi: {
    totalCarriers: number; activeCarriers: number; activeVehicles: number;
    totalTrips: number; totalQuantity: number; avgQuantity: number;
    topCarrierId: string | null; topCarrierName: string | null;
  };
};

/** Общ преглед: rollup на per-vehicle агрегатите към превозвачите (без N+1). */
export function aggregateCarrierOverview(carriers: CarrierLite[], vehicles: VehicleCarrier[], tripAgg: TripAgg[]): CarrierOverview {
  const carrierOfVehicle = new Map(vehicles.map((v) => [v.vehicleId, v.carrierId]));
  const perCarrier = new Map<string, { trips: number; quantity: number; last: number | null }>();
  const bump = (cid: string, t: TripAgg) => {
    const a = perCarrier.get(cid) ?? { trips: 0, quantity: 0, last: null };
    a.trips += t.trips; a.quantity = round3(a.quantity + t.quantity);
    const ts = t.lastDelivery ? Date.parse(t.lastDelivery) : null;
    if (ts && (!a.last || ts > a.last)) a.last = ts;
    perCarrier.set(cid, a);
  };
  for (const t of tripAgg) {
    if (!t.truckVehicleId) continue;
    const cid = carrierOfVehicle.get(t.truckVehicleId);
    if (cid) bump(cid, t);
  }
  const vehTotal = new Map<string, number>(), vehActive = new Map<string, number>();
  for (const v of vehicles) {
    if (!v.carrierId) continue;
    vehTotal.set(v.carrierId, (vehTotal.get(v.carrierId) ?? 0) + 1);
    if (v.active) vehActive.set(v.carrierId, (vehActive.get(v.carrierId) ?? 0) + 1);
  }

  const rows: CarrierRow[] = carriers.map((c) => {
    const a = perCarrier.get(c.id);
    return {
      ...c,
      vehiclesTotal: vehTotal.get(c.id) ?? 0,
      vehiclesActive: vehActive.get(c.id) ?? 0,
      trips: a?.trips ?? 0,
      quantity: a?.quantity ?? 0,
      lastDelivery: a?.last ? new Date(a.last).toISOString() : null,
    };
  });

  const totalTrips = rows.reduce((s, r) => s + r.trips, 0);
  const totalQuantity = round3(rows.reduce((s, r) => s + r.quantity, 0));
  const top = [...rows].sort((a, b) => b.trips - a.trips || b.quantity - a.quantity)[0];
  return {
    rows,
    kpi: {
      totalCarriers: carriers.length,
      activeCarriers: carriers.filter((c) => c.active).length,
      activeVehicles: vehicles.filter((v) => v.active).length,
      totalTrips,
      totalQuantity,
      avgQuantity: totalTrips > 0 ? round3(totalQuantity / totalTrips) : 0,
      topCarrierId: top && top.trips > 0 ? top.id : null,
      topCarrierName: top && top.trips > 0 ? top.name : null,
    },
  };
}

// ─────────────── Досие на превозвач ───────────────

export type DeliveryRow = {
  id: string; shipmentDate: string | null; truckVehicleId: string | null;
  truckReg: string | null; trailer: string | null; destination: string | null;
  destKey: string | null; product: string | null; quantity: number | null; status: string | null;
};

export type CarrierDetailStats = {
  totalTrips: number; totalQuantity: number; avgQuantity: number;
  tripsThisMonth: number; quantityThisMonth: number;
  firstDeliveryAt: string | null; lastDeliveryAt: string | null;
  maxTripQuantity: number; distinctVehicles: number; distinctDestinations: number;
  byVehicle: { vehicleId: string; truckReg: string | null; trips: number; quantity: number; avg: number; lastDelivery: string | null }[];
  byDestination: { destination: string; trips: number; quantity: number }[];
  byMonth: { month: string; trips: number; quantity: number }[];
};

/** Агрегати за досието на превозвача от неговите доставки (canonical = ExportDocumentSet). */
export function aggregateCarrierDetail(rows: DeliveryRow[], now: Date = new Date()): CarrierDetailStats {
  const y = now.getFullYear(), m = now.getMonth();
  let totalH = 0, monthH = 0, monthCount = 0, maxQ = 0;
  let first: number | null = null, last: number | null = null;
  const veh = new Map<string, { truckReg: string | null; trips: number; h: number; last: number | null }>();
  const dest = new Map<string, { trips: number; h: number }>();
  const month = new Map<string, { trips: number; h: number }>();
  const vehSet = new Set<string>(), destSet = new Set<string>();

  for (const r of rows) {
    const q = r.quantity ?? 0; const h = Math.round(q * 1000);
    totalH += h; if (q > maxQ) maxQ = q;
    const d = r.shipmentDate ? new Date(r.shipmentDate) : null;
    if (d) {
      const t = d.getTime();
      if (!first || t < first) first = t;
      if (!last || t > last) last = t;
      if (d.getFullYear() === y && d.getMonth() === m) { monthH += h; monthCount++; }
      const mk = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const mc = month.get(mk) ?? { trips: 0, h: 0 }; mc.trips++; mc.h += h; month.set(mk, mc);
    }
    if (r.truckVehicleId) {
      vehSet.add(r.truckVehicleId);
      const v = veh.get(r.truckVehicleId) ?? { truckReg: r.truckReg, trips: 0, h: 0, last: null };
      v.trips++; v.h += h; if (d && (!v.last || d.getTime() > v.last)) v.last = d.getTime();
      if (!v.truckReg && r.truckReg) v.truckReg = r.truckReg;
      veh.set(r.truckVehicleId, v);
    }
    const dk = (r.destination ?? "").trim();
    if (dk) { destSet.add(r.destKey ?? dk); const dc = dest.get(dk) ?? { trips: 0, h: 0 }; dc.trips++; dc.h += h; dest.set(dk, dc); }
  }
  const toT = (hh: number) => round3(hh / 1000);
  const total = rows.length;
  return {
    totalTrips: total,
    totalQuantity: toT(totalH),
    avgQuantity: total > 0 ? toT(Math.round(totalH / total)) : 0,
    tripsThisMonth: monthCount,
    quantityThisMonth: toT(monthH),
    firstDeliveryAt: first ? new Date(first).toISOString() : null,
    lastDeliveryAt: last ? new Date(last).toISOString() : null,
    maxTripQuantity: round3(maxQ),
    distinctVehicles: vehSet.size,
    distinctDestinations: destSet.size,
    byVehicle: [...veh.entries()].map(([vehicleId, v]) => ({ vehicleId, truckReg: v.truckReg, trips: v.trips, quantity: toT(v.h), avg: v.trips ? toT(Math.round(v.h / v.trips)) : 0, lastDelivery: v.last ? new Date(v.last).toISOString() : null })).sort((a, b) => b.trips - a.trips || b.quantity - a.quantity),
    byDestination: [...dest.entries()].map(([destination, d]) => ({ destination, trips: d.trips, quantity: toT(d.h) })).sort((a, b) => b.quantity - a.quantity),
    byMonth: [...month.entries()].sort((a, b) => b[0].localeCompare(a[0])).map(([mm, v]) => ({ month: mm, trips: v.trips, quantity: toT(v.h) })),
  };
}
