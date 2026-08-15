/**
 * Агрегиране за досиетата на автомобил и клиент (чисти функции — тествани).
 * Раздел 44/86: текущите данни се агрегират от операциите, не се пазят ръчно.
 */
import { sumMoney } from "@/lib/logistics/money";

function round3(n: number): number { return Math.round(n * 1000) / 1000; }

// ── Досие на автомобил ──
export type TripInput = {
  netQuantity?: number | null;
  dispatchDate?: string | Date | null;
  productName?: string | null;
  destination?: string | null;
};
export type VehicleHistory = {
  trips: number;
  totalTons: number;
  firstTrip: string | null;
  lastTrip: string | null;
  products: string[];
  destinations: string[];
};

/** Обобщава курсовете на един автомобил: брой, тонове, първи/последен, продукти, дестинации. */
export function vehicleHistorySummary(trips: TripInput[]): VehicleHistory {
  const dates = trips.map((t) => (t.dispatchDate ? new Date(t.dispatchDate) : null)).filter((d): d is Date => !!d && !isNaN(d.getTime()));
  dates.sort((a, b) => a.getTime() - b.getTime());
  const products = [...new Set(trips.map((t) => (t.productName ?? "").trim()).filter(Boolean))];
  const destinations = [...new Set(trips.map((t) => (t.destination ?? "").trim()).filter(Boolean))];
  return {
    trips: trips.length,
    totalTons: round3(trips.reduce((s, t) => s + (t.netQuantity && t.netQuantity > 0 ? t.netQuantity : 0), 0)),
    firstTrip: dates.length ? dates[0].toISOString() : null,
    lastTrip: dates.length ? dates[dates.length - 1].toISOString() : null,
    products, destinations,
  };
}

// ── Досие на клиент (MK продажби) ──
export type SaleLineInput = { quantity?: number | null; grossAmount?: number | null; lineTotal?: number | null; product?: string | null; date?: string | Date | null };
export type ClientSales = {
  invoicesCount: number;
  revenue: number;   // сума бруто
  quantity: number;
  lastPurchase: string | null;
  avgPricePerUnit: number | null;
  byProduct: { product: string; quantity: number; revenue: number }[];
};

/** Обобщава продажбите към клиент: оборот, количество, последна покупка, средна цена, по продукт. */
export function clientSalesSummary(lines: SaleLineInput[], invoicesCount: number): ClientSales {
  const revenue = sumMoney(lines.map((l) => l.grossAmount ?? l.lineTotal ?? 0));
  const quantity = round3(lines.reduce((s, l) => s + (l.quantity && l.quantity > 0 ? l.quantity : 0), 0));
  const dates = lines.map((l) => (l.date ? new Date(l.date) : null)).filter((d): d is Date => !!d && !isNaN(d.getTime()));
  dates.sort((a, b) => b.getTime() - a.getTime());
  const map = new Map<string, { quantity: number; revenue: number }>();
  for (const l of lines) {
    const p = (l.product ?? "—").trim() || "—";
    const cur = map.get(p) ?? { quantity: 0, revenue: 0 };
    cur.quantity = round3(cur.quantity + (l.quantity ?? 0));
    cur.revenue = sumMoney([cur.revenue, l.grossAmount ?? l.lineTotal ?? 0]);
    map.set(p, cur);
  }
  return {
    invoicesCount,
    revenue, quantity,
    lastPurchase: dates.length ? dates[0].toISOString() : null,
    avgPricePerUnit: quantity > 0 ? Math.round((revenue / quantity) * 100) / 100 : null,
    byProduct: [...map.entries()].map(([product, v]) => ({ product, ...v })).sort((a, b) => b.revenue - a.revenue),
  };
}
