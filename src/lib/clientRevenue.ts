// Споделен помощен код за приходи по клиент — обикновен модул (НЕ "use client"),
// за да може да се вика и от сървърни компоненти.

export type ClientRevenue = { name: string; total: number };

/** Агрегира приходите по клиент от фактури. */
export function aggregateClientRevenue(
  invoices: { client: { name: string } | null; lines: { lineTotal: number }[] }[]
): ClientRevenue[] {
  const map = new Map<string, number>();
  for (const inv of invoices) {
    if (!inv.client) continue;
    const sum = inv.lines.reduce((s, l) => s + l.lineTotal, 0);
    map.set(inv.client.name, (map.get(inv.client.name) ?? 0) + sum);
  }
  return [...map.entries()].map(([name, total]) => ({ name, total }));
}
