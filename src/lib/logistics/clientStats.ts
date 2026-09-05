/**
 * Чиста логика за списъка „Клиенти (логистика)" — сортиране и KPI върху вече агрегираните
 * per-client статистики от експортните доставки (§16-§18/§35/§36). DB агрегацията
 * (groupBy/aggregate) остава в API-то.
 */
export type ClientStatRow = {
  id: string;
  name: string;
  eik: string | null;
  deliveries: number;   // брой Export Deliveries към клиента (§17)
  quantity: number;     // сумарно количество цимент, 3 decimals (§18)
  lastDelivery: string | null;
};

export const CLIENT_SORTS = ["deliveries_desc", "quantity_desc", "recent", "name_asc"] as const;
export type ClientSort = (typeof CLIENT_SORTS)[number];

export function isClientSort(x: unknown): x is ClientSort {
  return typeof x === "string" && (CLIENT_SORTS as readonly string[]).includes(x);
}

const time = (s: string | null) => (s ? new Date(s).getTime() : 0);

/** Сортира клиентите според избора (§35). Стабилно, не мутира входа. */
export function sortClients(rows: ClientStatRow[], sort: ClientSort): ClientStatRow[] {
  const r = [...rows];
  switch (sort) {
    case "deliveries_desc": return r.sort((a, b) => b.deliveries - a.deliveries || a.name.localeCompare(b.name));
    case "quantity_desc": return r.sort((a, b) => b.quantity - a.quantity || a.name.localeCompare(b.name));
    case "recent": return r.sort((a, b) => time(b.lastDelivery) - time(a.lastDelivery) || a.name.localeCompare(b.name));
    case "name_asc": return r.sort((a, b) => a.name.localeCompare(b.name));
  }
}

/** KPI за екрана „Клиенти" за периода (§36). Активен клиент = поне 1 доставка в периода. */
export function clientKpis(rows: ClientStatRow[]) {
  const round3 = (n: number) => Math.round(n * 1000) / 1000;
  return {
    totalClients: rows.length,
    deliveries: rows.reduce((s, r) => s + r.deliveries, 0),
    quantity: round3(rows.reduce((s, r) => s + r.quantity, 0)),
    activeClients: rows.filter((r) => r.deliveries > 0).length,
  };
}
