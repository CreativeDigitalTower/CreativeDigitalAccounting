import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { logisticsApiGuard, groupCounterparties } from "@/lib/logistics/access";
import { audit } from "@/lib/documents";
import { nextSequenceValue } from "@/lib/logistics/sequence";
import { SEQ_SCOPE, formatSequenceNumber, EXPORT_INVOICE_FORMAT, suggestDispatchFromInvoice } from "@/lib/logistics/config";
import { truckTrailerLabel } from "@/lib/logistics/exportDocs";
import { z } from "zod";

const listSelect = {
  id: true, invoiceNumber: true, invoiceDate: true, destination: true, truckRegSnapshot: true, trailerReg: true,
  productSnapshot: true, quantity: true, unit: true, dispatchNumber: true, status: true, createdAt: true,
  documents: { select: { docType: true, status: true } },
} as const;

export async function GET() {
  const g = await logisticsApiGuard("view_logistics");
  if (!g.ok) return g.res;
  const sets = await prisma.exportDocumentSet.findMany({ where: { companyId: g.companyId }, select: listSelect, orderBy: { createdAt: "desc" }, take: 500 });
  return NextResponse.json(sets);
}

const optDate = z.string().datetime().nullable().optional().or(z.literal("").transform(() => null));
const schema = z.object({
  shipmentId: z.string().nullable().optional(),
  buyerCompanyId: z.string().nullable().optional(),
  clientId: z.string().nullable().optional(),
  invoiceNumber: z.string().max(60).nullable().optional(), // празно → auto
  invoiceDate: optDate,
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
          destination: d.destination ?? null, routeId: d.routeId || null,
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
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.issues[0]?.message ?? "Невалидни данни." }, { status: 400 });
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}
