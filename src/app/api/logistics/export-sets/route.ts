import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { logisticsApiGuard, groupCounterparties } from "@/lib/logistics/access";
import { audit } from "@/lib/documents";
import { nextSequenceValue } from "@/lib/logistics/sequence";
import { SEQ_SCOPE, formatSequenceNumber, EXPORT_INVOICE_FORMAT, suggestDispatchFromInvoice } from "@/lib/logistics/config";
import { truckTrailerLabel } from "@/lib/logistics/exportDocs";
import { PLACE_OF_SHIPMENT_DEFAULT } from "@/lib/logistics/deliveryTerms";
import { validationError, zodFieldErrors, VMSG, type FieldErrors } from "@/lib/logistics/validation";
import { z } from "zod";

const listSelect = {
  id: true, invoiceNumber: true, invoiceDate: true, destination: true, truckRegSnapshot: true, trailerReg: true,
  productSnapshot: true, quantity: true, unit: true, dispatchNumber: true, status: true, createdAt: true,
  buyerCompanyId: true, clientId: true,
  documents: { select: { docType: true, status: true, overridden: true } },
} as const;

export async function GET() {
  const g = await logisticsApiGuard("view_logistics");
  if (!g.ok) return g.res;
  const sets = await prisma.exportDocumentSet.findMany({ where: { companyId: g.companyId }, select: listSelect, orderBy: { createdAt: "desc" }, take: 500 });

  // Имена на купувача/клиента (няма пряка релация — резолваме наведнъж без N+1).
  const buyerIds = [...new Set(sets.map((s) => s.buyerCompanyId).filter(Boolean) as string[])];
  const clientIds = [...new Set(sets.map((s) => s.clientId).filter(Boolean) as string[])];
  const [buyers, clients] = await Promise.all([
    buyerIds.length ? prisma.company.findMany({ where: { id: { in: buyerIds } }, select: { id: true, name: true } }) : Promise.resolve([]),
    clientIds.length ? prisma.client.findMany({ where: { id: { in: clientIds }, companyId: g.companyId }, select: { id: true, name: true } }) : Promise.resolve([]),
  ]);
  const buyerName = new Map(buyers.map((b) => [b.id, b.name]));
  const clientName = new Map(clients.map((c) => [c.id, c.name]));

  const rows = sets.map(({ buyerCompanyId, clientId, ...s }) => ({
    ...s,
    buyer: (buyerCompanyId && buyerName.get(buyerCompanyId)) || (clientId && clientName.get(clientId)) || null,
  }));
  return NextResponse.json(rows);
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
      d.logisticsProductId ? prisma.logisticsProduct.findFirst({ where: { id: d.logisticsProductId, companyId: g.companyId }, select: { canonicalName: true, unit: true } }) : Promise.resolve(null),
      d.shipmentId ? prisma.shipment.findFirst({ where: { id: d.shipmentId, companyId: g.companyId }, select: { id: true } }) : Promise.resolve(null),
      d.buyerCompanyId ? prisma.company.findUnique({ where: { id: d.buyerCompanyId }, select: { id: true } }) : Promise.resolve(null),
      d.clientId ? prisma.client.findFirst({ where: { id: d.clientId, companyId: g.companyId }, select: { id: true } }) : Promise.resolve(null),
    ]);
    if (d.truckVehicleId && !vehicle) return NextResponse.json({ error: "Автомобилът не е намерен." }, { status: 404 });
    if (d.logisticsProductId && !product) return NextResponse.json({ error: "Продуктът не е намерен." }, { status: 404 });
    if (d.shipmentId && !shipment) return NextResponse.json({ error: "Курсът не е намерен." }, { status: 404 });
    // buyerCompanyId трябва да е свързана фирма от групата.
    if (d.buyerCompanyId) {
      const cps = await groupCounterparties(g.companyId);
      if (!cps.some((c) => c.id === d.buyerCompanyId)) return NextResponse.json({ error: "Купувачът не е свързана фирма от групата." }, { status: 400 });
    }
    if (d.clientId && !client) return NextResponse.json({ error: "Клиентът не е намерен." }, { status: 404 });

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
