import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logisticsApiGuard } from "@/lib/logistics/access";
import { normalizeCompanyName } from "@/lib/logistics/normalize";
import { buildReceivedView, type ReceivedSetInput } from "@/lib/logistics/received";

// Споделена intercompany visibility (§2/§4): получените доставки са export set-овете,
// в които АКТИВНАТА фирма (MK) е купувач (buyerCompanyId), издадени от продавач (BG) в
// същата CompanyGroup. Read-only проекция — БЕЗ дублиране. Обогатено с краен клиент,
// MK фактура (по sourceExportSetId) и KPI (§5/§7/§9).
export async function GET() {
  const g = await logisticsApiGuard("view_logistics");
  if (!g.ok) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const me = await prisma.company.findUnique({ where: { id: g.companyId }, select: { companyGroupId: true } });
  if (!me?.companyGroupId) return NextResponse.json({ kpi: { received: 0, uninvoiced: 0, invoiced: 0, totalQuantity: 0 }, rows: [] });

  const sets = await prisma.exportDocumentSet.findMany({
    where: { buyerCompanyId: g.companyId, deletedAt: null, company: { companyGroupId: me.companyGroupId } },
    select: {
      id: true, invoiceNumber: true, invoiceDate: true, destination: true, deliveryTerm: true,
      truckRegSnapshot: true, trailerReg: true, productSnapshot: true, quantity: true, unit: true, status: true,
      companyId: true, clientId: true,
    },
    orderBy: { createdAt: "desc" }, take: 1000,
  });

  const sellerIds = [...new Set(sets.map((s) => s.companyId))];
  const bgClientIds = [...new Set(sets.map((s) => s.clientId).filter((x): x is string => !!x))];
  const setIds = sets.map((s) => s.id);

  const [sellers, bgClients, mkInvoices, mkClients] = await Promise.all([
    sellerIds.length ? prisma.company.findMany({ where: { id: { in: sellerIds } }, select: { id: true, name: true } }) : Promise.resolve([]),
    // Имената на крайните клиенти, посочени от BG страната (за предложение при фактуриране).
    bgClientIds.length ? prisma.client.findMany({ where: { id: { in: bgClientIds } }, select: { id: true, name: true } }) : Promise.resolve([]),
    // MK фактурите на активната фирма, издадени от тези доставки (§18/§19).
    setIds.length ? prisma.mkInvoice.findMany({ where: { companyId: g.companyId, sourceExportSetId: { in: setIds } }, select: { id: true, number: true, sourceExportSetId: true } }) : Promise.resolve([]),
    // Собствените CRM клиенти на MK фирмата — за автопопълване на крайния клиент (§12/§13).
    prisma.client.findMany({ where: { companyId: g.companyId }, select: { id: true, name: true } }),
  ]);

  const sellerName = new Map(sellers.map((c) => [c.id, c.name]));
  const bgClientName = new Map(bgClients.map((c) => [c.id, c.name]));
  const invoiceBySetId = new Map(mkInvoices.filter((i) => i.sourceExportSetId).map((i) => [i.sourceExportSetId as string, { id: i.id, number: i.number }]));
  const mkClientByNorm = new Map(mkClients.map((c) => [normalizeCompanyName(c.name), c.id]));
  const bgClientNameBySet = new Map(sets.map((s) => [s.id, s.clientId ? (bgClientName.get(s.clientId) ?? null) : null]));

  const input: ReceivedSetInput[] = sets.map((s) => ({
    id: s.id, invoiceNumber: s.invoiceNumber, invoiceDate: s.invoiceDate, destination: s.destination,
    deliveryTerm: s.deliveryTerm, truckRegSnapshot: s.truckRegSnapshot, trailerReg: s.trailerReg,
    productSnapshot: s.productSnapshot, quantity: s.quantity, unit: s.unit, status: s.status,
    sellerName: sellerName.get(s.companyId) ?? null, clientName: bgClientNameBySet.get(s.id) ?? null,
  }));

  // Предложен MK клиент: match по нормализирано име на BG-посочения краен клиент (§13).
  const view = buildReceivedView(input, invoiceBySetId, (s) => {
    if (!s.clientName) return null;
    return mkClientByNorm.get(normalizeCompanyName(s.clientName)) ?? null;
  });

  return NextResponse.json(view);
}
