import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logisticsApiGuard } from "@/lib/logistics/access";
import { normalizeCompanyName } from "@/lib/logistics/normalize";
import { buildReceivedView, type ReceivedSetInput } from "@/lib/logistics/received";
import { loadDeliveryInvoiceMap } from "@/lib/logistics/deliveryInvoice";

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

  const [sellers, bgClients, invoiceBySetId, mkClients] = await Promise.all([
    sellerIds.length ? prisma.company.findMany({ where: { id: { in: sellerIds } }, select: { id: true, name: true } }) : Promise.resolve([]),
    // Имената на крайните клиенти, посочени от BG страната (за предложение при фактуриране).
    bgClientIds.length ? prisma.client.findMany({ where: { id: { in: bgClientIds } }, select: { id: true, name: true, companyId: true } }) : Promise.resolve([]),
    // Канонична резолюция: bulk link → легаси sourceExportSetId → легаси MkInvoice (§12).
    loadDeliveryInvoiceMap(g.companyId, setIds),
    // Собствените CRM клиенти на MK фирмата — за автопопълване на крайния клиент (§12/§13).
    prisma.client.findMany({ where: { companyId: g.companyId }, select: { id: true, name: true } }),
  ]);

  const sellerName = new Map(sellers.map((c) => [c.id, c.name]));
  const bgClientById = new Map(bgClients.map((c) => [c.id, c]));
  const mkClientByNorm = new Map(mkClients.map((c) => [normalizeCompanyName(c.name), c.id]));

  // Канонична идентичност на крайния клиент (§4): ако доставката вече сочи SEM CRM клиент →
  // него; иначе match по нормализирано име към SEM CRM клиент. ID, не fuzzy име.
  const finalClientIdFor = (clientId: string | null): string | null => {
    if (!clientId) return null;
    const c = bgClientById.get(clientId);
    if (!c) return null;
    if (c.companyId === g.companyId) return clientId; // вече SEM клиент
    return mkClientByNorm.get(normalizeCompanyName(c.name)) ?? null;
  };

  const input: ReceivedSetInput[] = sets.map((s) => ({
    id: s.id, invoiceNumber: s.invoiceNumber, invoiceDate: s.invoiceDate, destination: s.destination,
    deliveryTerm: s.deliveryTerm, truckRegSnapshot: s.truckRegSnapshot, trailerReg: s.trailerReg,
    productSnapshot: s.productSnapshot, quantity: s.quantity, unit: s.unit, status: s.status,
    sellerName: sellerName.get(s.companyId) ?? null,
    clientName: s.clientId ? (bgClientById.get(s.clientId)?.name ?? null) : null,
    finalClientId: finalClientIdFor(s.clientId),
  }));

  // Предложен MK клиент: match по нормализирано име на BG-посочения краен клиент (§13).
  const view = buildReceivedView(input, invoiceBySetId, (s) => {
    if (!s.clientName) return null;
    return mkClientByNorm.get(normalizeCompanyName(s.clientName)) ?? null;
  });

  return NextResponse.json(view);
}
