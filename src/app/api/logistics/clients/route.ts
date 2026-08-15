import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logisticsApiGuard } from "@/lib/logistics/access";
import { clientSalesSummary } from "@/lib/logistics/dossier";

// Клиенти на фирмата с агрегирани MK продажби (оборот/количество/последна покупка).
export async function GET() {
  const g = await logisticsApiGuard("view_analytics");
  if (!g.ok) return g.res;
  const clients = await prisma.client.findMany({
    where: { companyId: g.companyId },
    select: { id: true, name: true, eik: true, mkInvoices: { select: { date: true, lines: { select: { quantity: true, grossAmount: true, lineTotal: true, productSnapshot: true } } } } },
    orderBy: { name: "asc" }, take: 2000,
  });
  const out = clients.map((c) => {
    const lines = c.mkInvoices.flatMap((inv) => inv.lines.map((l) => ({ ...l, product: l.productSnapshot, date: inv.date })));
    const s = clientSalesSummary(lines, c.mkInvoices.length);
    return { id: c.id, name: c.name, eik: c.eik, invoices: s.invoicesCount, revenue: s.revenue, quantity: s.quantity, lastPurchase: s.lastPurchase };
  });
  return NextResponse.json(out);
}
