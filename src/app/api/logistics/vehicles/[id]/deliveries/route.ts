import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { logisticsApiGuard } from "@/lib/logistics/access";
import { isActiveExportDocType } from "@/lib/logistics/config";
import { buildVehicleDeliveryMatch } from "@/lib/logistics/vehicleDeliveries";

// Историята на курсовете за конкретен автомобил (§7/§8/§25-§28) — основната архивна
// таблица. Company-scoped, server-side филтри + sort + pagination + KPI (§13/§38/§39).
// Връща само БРОЙКИ на документи (не файлове, §40). Legacy fallback: свързва и стари
// доставки без truckVehicleId по регистрационен номер/alias (§30/§31).
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await logisticsApiGuard("view_logistics");
  if (!g.ok) return g.res;
  const { id } = await params;
  const sp = new URL(req.url).searchParams;
  const page = Math.max(1, Number(sp.get("page")) || 1);
  const pageSize = Math.min(50, Math.max(5, Number(sp.get("pageSize")) || 20));

  const veh = await prisma.vehicle.findFirst({
    where: { id, companyId: g.companyId },
    select: { id: true, registration: true, aliases: { select: { alias: true } } },
  });
  if (!veh) return NextResponse.json({ error: "Не е намерен." }, { status: 404 });

  // §30/§31: primary = truckVehicleId; legacy fallback = точен рег.номер/alias, но САМО
  // когато truckVehicleId липсва (без destructive backfill; неясен match не се свързва).
  const vehicleMatch: Prisma.ExportDocumentSetWhereInput = buildVehicleDeliveryMatch(id, [veh.registration, ...veh.aliases.map((a) => a.alias)]);

  const q = (sp.get("q") ?? "").trim();
  const status = sp.get("status") ?? "";
  const destination = sp.get("destination") ?? "";
  const product = (sp.get("product") ?? "").trim();
  const clientId = sp.get("clientId") ?? "";
  const hasAttachments = sp.get("hasAttachments");
  const includeDeleted = sp.get("includeDeleted") === "1";

  let gte: Date | undefined, lte: Date | undefined;
  const df = sp.get("dateFrom"), dtp = sp.get("dateTo");
  const year = Number(sp.get("year")) || 0, month = sp.get("month") != null ? Number(sp.get("month")) : NaN;
  if (df) gte = new Date(df + "T00:00:00");
  if (dtp) lte = new Date(dtp + "T23:59:59");
  if (year) { gte = new Date(year, Number.isNaN(month) ? 0 : month, 1); lte = new Date(year, Number.isNaN(month) ? 12 : month + 1, 0, 23, 59, 59); }

  const where: Prisma.ExportDocumentSetWhereInput = {
    companyId: g.companyId,
    ...(includeDeleted ? {} : { deletedAt: null }),
    AND: [vehicleMatch],
    ...(status ? { status } : {}),
    ...(destination ? { destination } : {}),
    ...(clientId ? { clientId } : {}),
    ...(product ? { productSnapshot: { contains: product, mode: "insensitive" } } : {}),
    ...(gte || lte ? { shipmentDate: { ...(gte ? { gte } : {}), ...(lte ? { lte } : {}) } } : {}),
    ...(hasAttachments === "1" ? { attachments: { some: {} } } : hasAttachments === "0" ? { attachments: { none: {} } } : {}),
    ...(q ? { OR: [
      { invoiceNumber: { contains: q, mode: "insensitive" } },
      { dispatchNumber: { contains: q, mode: "insensitive" } },
      { trailerReg: { contains: q, mode: "insensitive" } },
      { destination: { contains: q, mode: "insensitive" } },
      { productSnapshot: { contains: q, mode: "insensitive" } },
      { attachments: { some: { OR: [{ name: { contains: q, mode: "insensitive" } }, { documentNumber: { contains: q, mode: "insensitive" } }] } } },
    ] } : {}),
  };

  // Само за KPI/aggregation — всички (не изтрити) курсове на автомобила (§39).
  const kpiWhere: Prisma.ExportDocumentSetWhereInput = { companyId: g.companyId, deletedAt: null, AND: [vehicleMatch] };
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

  const [total, sets, kTotal, kMonth, kQty, kLast, kAtt] = await Promise.all([
    prisma.exportDocumentSet.count({ where }),
    prisma.exportDocumentSet.findMany({
      where, orderBy: [{ shipmentDate: "desc" }, { invoiceDate: "desc" }], skip: (page - 1) * pageSize, take: pageSize,
      select: {
        id: true, invoiceNumber: true, invoiceDate: true, shipmentDate: true, dispatchNumber: true, trailerReg: true, truckRegSnapshot: true,
        destination: true, deliveryTerm: true, placeOfShipment: true, productSnapshot: true, quantity: true, unit: true, status: true, deletedAt: true,
        clientId: true, buyerCompanyId: true,
        documents: { select: { docType: true } },
        invoices: { where: { deletedAt: null, status: { not: "cancelled" } }, select: { id: true, number: true }, take: 1 },
        mkInvoices: { where: { documentId: null }, select: { id: true, number: true }, take: 1 },
        _count: { select: { attachments: true } },
      },
    }),
    prisma.exportDocumentSet.count({ where: kpiWhere }),
    prisma.exportDocumentSet.count({ where: { ...kpiWhere, shipmentDate: { gte: monthStart } } }),
    prisma.exportDocumentSet.aggregate({ where: kpiWhere, _sum: { quantity: true } }),
    prisma.exportDocumentSet.findFirst({ where: kpiWhere, orderBy: [{ shipmentDate: "desc" }], select: { shipmentDate: true, invoiceDate: true } }),
    prisma.exportAttachment.count({ where: { exportSet: kpiWhere } }),
  ]);

  const clientIds = [...new Set(sets.map((s) => s.clientId).filter(Boolean) as string[])];
  const clients = clientIds.length ? await prisma.client.findMany({ where: { id: { in: clientIds } }, select: { id: true, name: true } }) : [];
  const cName = new Map(clients.map((c) => [c.id, c.name]));

  const rows = sets.map(({ clientId: cid, _count, documents, invoices, mkInvoices, ...s }) => {
    const generatedDocumentCount = documents.filter((d) => isActiveExportDocType(d.docType)).length;
    const mk = invoices[0] ? { id: invoices[0].id, number: invoices[0].number, kind: "document" as const }
      : mkInvoices[0] ? { id: mkInvoices[0].id, number: mkInvoices[0].number, kind: "mk" as const } : null;
    return { ...s, client: (cid && cName.get(cid)) || null, generatedDocumentCount, attachmentCount: _count.attachments, mkInvoice: mk };
  });

  const kpi = {
    total: kTotal, thisMonth: kMonth,
    totalQuantity: Math.round((kQty._sum.quantity ?? 0) * 1000) / 1000,
    lastDelivery: kLast?.shipmentDate ?? kLast?.invoiceDate ?? null,
    generatedDocuments: rows.reduce((n) => n, 0), // изчислява се по-долу глобално
    totalDocuments: 0, attachments: kAtt,
  };
  // Общо генерирани документи за автомобила (активни типове) — отделно count.
  const genCount = await prisma.exportDocument.count({ where: { docType: { in: ["invoice", "dispatch", "declaration", "cmr_hp"] }, set: kpiWhere } });
  kpi.generatedDocuments = genCount;
  kpi.totalDocuments = genCount + kAtt;

  return NextResponse.json({ rows, total, page, pageSize, kpi });
}
