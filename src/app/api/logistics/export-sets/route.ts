import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { logisticsApiGuard, groupCounterparties, companyCanCreateExports } from "@/lib/logistics/access";
import { audit } from "@/lib/documents";
import { nextSequenceValue } from "@/lib/logistics/sequence";
import { SEQ_SCOPE, formatSequenceNumber, EXPORT_INVOICE_FORMAT, suggestDispatchFromInvoice } from "@/lib/logistics/config";
import { truckTrailerLabel } from "@/lib/logistics/exportDocs";
import { PLACE_OF_SHIPMENT_DEFAULT } from "@/lib/logistics/deliveryTerms";
import { validationError, zodFieldErrors, VMSG, type FieldErrors } from "@/lib/logistics/validation";
import { clientCompanyAllowed } from "@/lib/logistics/clientScope";
import { z } from "zod";

const listSelect = {
  id: true, invoiceNumber: true, invoiceDate: true, shipmentDate: true, destination: true, truckRegSnapshot: true, trailerReg: true,
  productSnapshot: true, quantity: true, unit: true, dispatchNumber: true, status: true, createdAt: true,
  buyerCompanyId: true, clientId: true,
  documents: { select: { docType: true, status: true, overridden: true } },
  _count: { select: { attachments: true } },
} as const;

// Архивът е реална база данни (§29-§33): server-side филтри, сортиране, pagination и
// KPI-та. Списъкът връща само БРОЙКИ на документи (не файлове, §50).
export async function GET(req: Request) {
  const g = await logisticsApiGuard("view_logistics");
  if (!g.ok) return g.res;
  const sp = new URL(req.url).searchParams;
  const trash = sp.get("trash") === "1";
  const q = (sp.get("q") ?? "").trim();
  const status = sp.get("status") ?? "";
  const destination = sp.get("destination") ?? "";
  const vehicle = (sp.get("vehicle") ?? "").trim();
  const product = (sp.get("product") ?? "").trim();
  const clientId = sp.get("clientId") ?? "";
  const hasAttachments = sp.get("hasAttachments"); // "1" | "0" | null
  const sort = sp.get("sort") ?? "date";
  const page = Math.max(1, Number(sp.get("page")) || 1);
  const pageSize = Math.min(100, Math.max(5, Number(sp.get("pageSize")) || 25));

  // Диапазон по дата: dateFrom/dateTo или месец/година (§30). Върху invoiceDate.
  let gte: Date | undefined, lte: Date | undefined;
  const df = sp.get("dateFrom"), dt = sp.get("dateTo");
  const year = Number(sp.get("year")) || 0, month = sp.get("month") != null ? Number(sp.get("month")) : NaN;
  if (df) gte = new Date(df + "T00:00:00");
  if (dt) lte = new Date(dt + "T23:59:59");
  if (year) { gte = new Date(year, Number.isNaN(month) ? 0 : month, 1); lte = new Date(year, Number.isNaN(month) ? 12 : month + 1, 0, 23, 59, 59); }

  const where: Prisma.ExportDocumentSetWhereInput = {
    companyId: g.companyId, deletedAt: trash ? { not: null } : null,
    ...(status ? { status } : {}),
    ...(destination ? { destination } : {}),
    ...(clientId ? { clientId } : {}),
    ...(vehicle ? { OR: [{ truckRegSnapshot: { contains: vehicle, mode: "insensitive" } }, { trailerReg: { contains: vehicle, mode: "insensitive" } }] } : {}),
    ...(product ? { productSnapshot: { contains: product, mode: "insensitive" } } : {}),
    ...(gte || lte ? { invoiceDate: { ...(gte ? { gte } : {}), ...(lte ? { lte } : {}) } } : {}),
    ...(hasAttachments === "1" ? { attachments: { some: {} } } : hasAttachments === "0" ? { attachments: { none: {} } } : {}),
    ...(q ? { OR: [
      { invoiceNumber: { contains: q, mode: "insensitive" } },
      { dispatchNumber: { contains: q, mode: "insensitive" } },
      { truckRegSnapshot: { contains: q, mode: "insensitive" } },
      { trailerReg: { contains: q, mode: "insensitive" } },
      { destination: { contains: q, mode: "insensitive" } },
      { productSnapshot: { contains: q, mode: "insensitive" } },
    ] } : {}),
  };

  const orderBy: Prisma.ExportDocumentSetOrderByWithRelationInput =
    trash ? { deletedAt: "desc" }
    : sort === "quantity" ? { quantity: "desc" }
    : sort === "invoice" ? { invoiceNumber: "desc" }
    : { invoiceDate: "desc" };

  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const [total, sets, kAll, kMonth, kQty, kWithAtt] = await Promise.all([
    prisma.exportDocumentSet.count({ where }),
    prisma.exportDocumentSet.findMany({ where, select: listSelect, orderBy, skip: (page - 1) * pageSize, take: pageSize }),
    prisma.exportDocumentSet.count({ where: { companyId: g.companyId, deletedAt: null } }),
    prisma.exportDocumentSet.count({ where: { companyId: g.companyId, deletedAt: null, invoiceDate: { gte: monthStart } } }),
    prisma.exportDocumentSet.aggregate({ where: { companyId: g.companyId, deletedAt: null }, _sum: { quantity: true } }),
    prisma.exportDocumentSet.count({ where: { companyId: g.companyId, deletedAt: null, attachments: { some: {} } } }),
  ]);

  const buyerIds = [...new Set(sets.map((s) => s.buyerCompanyId).filter(Boolean) as string[])];
  const clientIds = [...new Set(sets.map((s) => s.clientId).filter(Boolean) as string[])];
  const [buyers, clients] = await Promise.all([
    buyerIds.length ? prisma.company.findMany({ where: { id: { in: buyerIds } }, select: { id: true, name: true } }) : Promise.resolve([]),
    // Клиентите може да са на buyer (SEM) фирмата → резолваме по id, без company scope.
    clientIds.length ? prisma.client.findMany({ where: { id: { in: clientIds } }, select: { id: true, name: true } }) : Promise.resolve([]),
  ]);
  const buyerName = new Map(buyers.map((b) => [b.id, b.name]));
  const clientName = new Map(clients.map((c) => [c.id, c.name]));

  const rows = sets.map(({ buyerCompanyId, clientId: cid, _count, documents, ...s }) => ({
    ...s, documents,
    buyer: (buyerCompanyId && buyerName.get(buyerCompanyId)) || (cid && clientName.get(cid)) || null,
    attachmentCount: _count.attachments,
  }));
  const kpi = { total: kAll, thisMonth: kMonth, totalQuantity: Math.round((kQty._sum.quantity ?? 0) * 1000) / 1000, withAttachments: kWithAtt, withoutAttachments: kAll - kWithAtt };
  return NextResponse.json({ rows, total, page, pageSize, kpi });
}

const optDate = z.string().datetime().nullable().optional().or(z.literal("").transform(() => null));
const schema = z.object({
  shipmentId: z.string().nullable().optional(),
  buyerCompanyId: z.string().nullable().optional(),
  clientId: z.string().nullable().optional(),
  invoiceNumber: z.string().max(60).nullable().optional(), // празно → auto
  invoiceDate: optDate,
  shipmentDate: optDate,
  deliveryTerm: z.enum(["FCA", "CPT"]).nullable().optional(),
  placeOfShipment: z.string().max(200).nullable().optional(),
  destination: z.string().max(200).nullable().optional(),
  routeId: z.string().nullable().optional(),
  truckVehicleId: z.string().nullable().optional(),
  trailerReg: z.string().max(40).nullable().optional(),
  logisticsProductId: z.string().nullable().optional(),
  quantity: z.number().positive().nullable().optional(),
  unit: z.string().max(20).optional(),
  declarationCmrDate: optDate,
  dispatchNumber: z.string().max(60).nullable().optional(),
  note: z.string().max(2000).nullable().optional(),
});

export async function POST(req: Request) {
  const g = await logisticsApiGuard("manage_documents");
  if (!g.ok) return g.res;
  // §1/§11: MK получателят (SEM) НЕ може да създава BG експортни доставки — server-side,
  // независимо от body/URL. Company-scoped флаг, не hardcode.
  if (!(await companyCanCreateExports(g.companyId))) {
    return NextResponse.json({ error: "Тази фирма не може да създава експортни доставки." }, { status: 403 });
  }
  try {
    const d = schema.parse(await req.json());

    // Задължителни полета (§10) — структуриран validation отговор, без silent failure.
    // При създаване от нулата (без съществуващ курс) искаме автомобил, продукт и количество.
    if (!d.shipmentId) {
      const fe: FieldErrors = {};
      if (!d.truckVehicleId) fe.truckVehicleId = VMSG.vehicle;
      if (!d.logisticsProductId) fe.logisticsProductId = VMSG.product;
      if (d.quantity == null) fe.quantity = VMSG.quantity;
      else if (!(d.quantity > 0)) fe.quantity = VMSG.quantityPositive;
      // Условия на доставка са задължителни (§1/§19); при CPT — и дестинация (§3).
      if (!d.deliveryTerm) fe.deliveryTerm = "Моля, изберете условия на доставка – FCA или CPT.";
      // Дестинацията е задължителна за FCA и CPT (§5/§20); place of shipment има default.
      if (!(d.destination ?? "").trim()) fe.destination = "Моля, изберете или въведете крайна дестинация.";
      if (Object.keys(fe).length) return validationError(fe);
    }

    // Snapshots + валидиране на собственост.
    const [vehicle, product, shipment, buyer, client] = await Promise.all([
      d.truckVehicleId ? prisma.vehicle.findFirst({ where: { id: d.truckVehicleId, companyId: g.companyId }, select: { registration: true, logisticsProfile: { select: { trailerReg: true } } } }) : Promise.resolve(null),
      d.logisticsProductId ? prisma.logisticsProduct.findFirst({ where: { id: d.logisticsProductId, companyId: g.companyId }, select: { canonicalName: true, unit: true, certificateNumber: true } }) : Promise.resolve(null),
      d.shipmentId ? prisma.shipment.findFirst({ where: { id: d.shipmentId, companyId: g.companyId }, select: { id: true } }) : Promise.resolve(null),
      d.buyerCompanyId ? prisma.company.findUnique({ where: { id: d.buyerCompanyId }, select: { id: true } }) : Promise.resolve(null),
      // Краен клиент: зареждаме по id (+ companyId за валидация), защото може да е клиент
      // на СВЪРЗАНАТА buyer фирма (SEM), не на активната (§1/§2).
      d.clientId ? prisma.client.findUnique({ where: { id: d.clientId }, select: { id: true, companyId: true } }) : Promise.resolve(null),
    ]);
    if (d.truckVehicleId && !vehicle) return NextResponse.json({ error: "Автомобилът не е намерен." }, { status: 404 });
    if (d.logisticsProductId && !product) return NextResponse.json({ error: "Продуктът не е намерен." }, { status: 404 });
    if (d.shipmentId && !shipment) return NextResponse.json({ error: "Курсът не е намерен." }, { status: 404 });
    // buyerCompanyId трябва да е свързана фирма от групата.
    if (d.buyerCompanyId) {
      const cps = await groupCounterparties(g.companyId);
      if (!cps.some((c) => c.id === d.buyerCompanyId)) return NextResponse.json({ error: "Купувачът не е свързана фирма от групата." }, { status: 400 });
    }
    // Клиентът трябва да е на buyer фирмата (SEM) или на активната (legacy) — cross-company
    // само в рамките на групата (§3).
    if (d.clientId) {
      if (!client) return NextResponse.json({ error: "Клиентът не е намерен." }, { status: 404 });
      if (!clientCompanyAllowed(client.companyId, { activeCompanyId: g.companyId, buyerCompanyId: d.buyerCompanyId })) {
        return NextResponse.json({ error: "Клиентът не е от свързана фирма." }, { status: 400 });
      }
    }

    const year = (d.invoiceDate ? new Date(d.invoiceDate) : new Date()).getFullYear();
    const trailer = d.trailerReg ?? vehicle?.logisticsProfile?.trailerReg ?? null;
    const unit = d.unit || product?.unit || "t";

    const set = await prisma.$transaction(async (tx) => {
      // Invoice номер: ръчен override ИЛИ атомарен пореден (concurrency-safe).
      let invoiceNumber = d.invoiceNumber?.trim() || "";
      if (!invoiceNumber) {
        const val = await nextSequenceValue(tx, g.companyId, SEQ_SCOPE.exportInvoice);
        invoiceNumber = formatSequenceNumber(val, EXPORT_INVOICE_FORMAT);
      }
      // Dispatch: ръчен override ИЛИ предложение от invoice (editable, не hard dependency).
      const dispatchNumber = d.dispatchNumber?.trim() || suggestDispatchFromInvoice(invoiceNumber) || String(await nextSequenceValue(tx, g.companyId, SEQ_SCOPE.dispatch));
      return tx.exportDocumentSet.create({
        data: {
          companyId: g.companyId, shipmentId: d.shipmentId || null, buyerCompanyId: d.buyerCompanyId || null, clientId: d.clientId || null,
          invoiceNumber, invoiceDate: d.invoiceDate ? new Date(d.invoiceDate) : new Date(),
          shipmentDate: d.shipmentDate ? new Date(d.shipmentDate) : (d.invoiceDate ? new Date(d.invoiceDate) : new Date()),
          // Условия на доставка (§1/§6): FCA → дестинация винаги Враца; CPT → подадената (§2/§3).
          // deliveryTerm/placeOfShipment/destination са ТРИ отделни стойности (§14).
          // Place of shipment по подразбиране = BELI IZVOR; destination е независима.
          deliveryTerm: d.deliveryTerm ?? null,
          placeOfShipment: (d.placeOfShipment ?? "").trim() || PLACE_OF_SHIPMENT_DEFAULT,
          destination: (d.destination ?? "").trim() || null, routeId: d.routeId || null,
          truckVehicleId: d.truckVehicleId || null, truckRegSnapshot: vehicle?.registration ?? null, trailerReg: trailer,
          logisticsProductId: d.logisticsProductId || null, productSnapshot: product?.canonicalName ?? null,
          certificateNumberSnapshot: product?.certificateNumber ?? null, // §17 — фиксира сертификата към момента
          quantity: d.quantity ?? null, unit, declarationCmrDate: d.declarationCmrDate ? new Date(d.declarationCmrDate) : null,
          dispatchNumber, note: d.note ?? null, createdById: g.userId,
        },
        select: { id: true, invoiceNumber: true, dispatchNumber: true },
      });
    });
    void year;
    await audit(g.companyId, g.userId, "create", "ExportDocumentSet", set.id, `Експортна доставка ${set.invoiceNumber} (${truckTrailerLabel(vehicle?.registration ?? null, trailer)})`);
    return NextResponse.json(set);
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return NextResponse.json({ error: "Фактура с този номер вече съществува." }, { status: 409 });
    }
    if (err instanceof z.ZodError) return validationError(zodFieldErrors(err));
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}
