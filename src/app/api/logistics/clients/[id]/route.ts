import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logisticsApiGuard } from "@/lib/logistics/access";
import { clientSalesSummary } from "@/lib/logistics/dossier";

// Досие на клиент: агрегирани продажби (от MK фактурите) + исторически данни (ръчни).
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await logisticsApiGuard("view_analytics");
  if (!g.ok) return g.res;
  const { id } = await params;
  const c = await prisma.client.findFirst({
    where: { id, companyId: g.companyId },
    select: {
      id: true, name: true, eik: true, city: true, address: true, country: true, phone: true, contactEmail: true,
      mkInvoices: {
        select: { id: true, number: true, date: true, currency: true, lines: { select: { quantity: true, grossAmount: true, lineTotal: true, productSnapshot: true } } },
        orderBy: { createdAt: "desc" },
      },
      historicalMetrics: { select: { id: true, year: true, revenue: true, quantity: true, unit: true, note: true }, orderBy: { year: "desc" } },
      historicalProductMetrics: { select: { id: true, year: true, product: true, quantity: true, revenue: true }, orderBy: { year: "desc" } },
    },
  });
  if (!c) return NextResponse.json({ error: "Не е намерен." }, { status: 404 });

  const lines = c.mkInvoices.flatMap((inv) => inv.lines.map((l) => ({ ...l, product: l.productSnapshot, date: inv.date })));
  const summary = clientSalesSummary(lines, c.mkInvoices.length);
  return NextResponse.json({
    id: c.id, name: c.name, eik: c.eik, city: c.city, address: c.address, country: c.country, phone: c.phone, contactEmail: c.contactEmail,
    summary,
    invoices: c.mkInvoices.map((inv) => ({ id: inv.id, number: inv.number, date: inv.date, currency: inv.currency, gross: inv.lines.reduce((s, l) => s + (l.grossAmount ?? 0), 0) })),
    historical: c.historicalMetrics,
    historicalProducts: c.historicalProductMetrics,
  });
}
