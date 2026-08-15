import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logisticsApiGuard } from "@/lib/logistics/access";
import { sumMoney } from "@/lib/logistics/money";
import { profitability, topN, comparePeriod, productAnalytics } from "@/lib/logistics/analytics";

const yearOf = (d: Date | null) => d ? new Date(d).getFullYear() : null;

// Аналитика за активната фирма — оборот/количество/марж по клиент/продукт/период.
export async function GET() {
  const g = await logisticsApiGuard("view_analytics");
  if (!g.ok) return g.res;
  const co = g.companyId;

  const [mkLines, holcimLinks, bgmkReceived, bgmkIssued, importCosts] = await Promise.all([
    prisma.mkInvoiceLine.findMany({
      where: { invoice: { companyId: co } },
      select: { quantity: true, lineTotal: true, productSnapshot: true, invoice: { select: { date: true, clientId: true, client: { select: { name: true } } } } },
    }),
    prisma.supplierInvoiceShipmentLink.findMany({
      where: { invoice: { companyId: co } },
      select: { quantity: true, lineTotal: true, materialCodeSnapshot: true, productSnapshot: true },
    }),
    prisma.bgMkInvoiceLine.findMany({ where: { invoice: { counterpartyCompanyId: co } }, select: { quantity: true, lineTotal: true, productSnapshot: true } }),
    prisma.bgMkInvoiceLine.findMany({ where: { invoice: { companyId: co } }, select: { lineTotal: true } }),
    prisma.importCost.findMany({ where: { shipment: { companyId: co }, includeInCost: true }, select: { baseAmount: true } }),
  ]);

  // Финанси / печалба
  const salesRevenue = sumMoney([sumMoney(mkLines.map((l) => l.lineTotal)), sumMoney(bgmkIssued.map((l) => l.lineTotal))]);
  const purchaseValue = sumMoney([sumMoney(holcimLinks.map((l) => l.lineTotal)), sumMoney(bgmkReceived.map((l) => l.lineTotal))]);
  const costs = sumMoney(importCosts.map((c) => c.baseAmount));
  const profit = profitability(purchaseValue, costs, salesRevenue);

  // Топ клиенти (по MK оборот)
  const byClient = new Map<string, { client: string; revenue: number; quantity: number; invoices: Set<string> }>();
  for (const l of mkLines) {
    const key = l.invoice.clientId ?? "—";
    const name = l.invoice.client?.name ?? "—";
    const cur = byClient.get(key) ?? { client: name, revenue: 0, quantity: 0, invoices: new Set() };
    cur.revenue = sumMoney([cur.revenue, l.lineTotal]);
    cur.quantity = Math.round((cur.quantity + l.quantity) * 1000) / 1000;
    byClient.set(key, cur);
  }
  const clients = [...byClient.values()].map((c) => ({ client: c.client, revenue: c.revenue, quantity: c.quantity }));
  const topByRevenue = topN(clients, (c) => c.revenue, 10);
  const topByTons = topN(clients, (c) => c.quantity, 10);

  // Анализ по продукт (продажби MK vs покупки Holcim+BG→MK received)
  const salesByProduct = mkLines.map((l) => ({ product: l.productSnapshot ?? "—", quantity: l.quantity, revenue: l.lineTotal }));
  const purchasesByProduct = [
    ...holcimLinks.map((l) => ({ product: l.productSnapshot ?? l.materialCodeSnapshot ?? "—", quantity: l.quantity, value: l.lineTotal })),
    ...bgmkReceived.map((l) => ({ product: l.productSnapshot ?? "—", quantity: l.quantity, value: l.lineTotal })),
  ];
  const products = productAnalytics(salesByProduct, purchasesByProduct);

  // Сравнение на периоди (текуща vs предходна година, по MK продажби)
  const curY = new Date().getFullYear();
  const prevY = curY - 1;
  const yrRev = (y: number) => sumMoney(mkLines.filter((l) => yearOf(l.invoice.date) === y).map((l) => l.lineTotal));
  const yrQty = (y: number) => Math.round(mkLines.filter((l) => yearOf(l.invoice.date) === y).reduce((s, l) => s + l.quantity, 0) * 1000) / 1000;
  const comparison = {
    prevYear: prevY, curYear: curY,
    revenue: comparePeriod("revenue", yrRev(prevY), yrRev(curY)),
    quantity: comparePeriod("quantity", yrQty(prevY), yrQty(curY)),
  };

  return NextResponse.json({ finances: profit, topByRevenue, topByTons, products, comparison });
}
