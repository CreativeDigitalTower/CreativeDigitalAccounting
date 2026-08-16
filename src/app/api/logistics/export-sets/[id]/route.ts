import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { logisticsApiGuard } from "@/lib/logistics/access";
import { audit } from "@/lib/documents";
import { z } from "zod";

const detailSelect = {
  id: true, companyId: true, shipmentId: true, buyerCompanyId: true, clientId: true,
  invoiceNumber: true, invoiceDate: true, destination: true, routeId: true,
  truckVehicleId: true, truckRegSnapshot: true, trailerReg: true, logisticsProductId: true, productSnapshot: true,
  quantity: true, unit: true, declarationCmrDate: true, dispatchNumber: true, status: true, note: true, createdAt: true,
  documents: { select: { id: true, docType: true, status: true, overridden: true, updatedAt: true } },
} as const;

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await logisticsApiGuard("view_logistics");
  if (!g.ok) return g.res;
  const { id } = await params;
  const set = await prisma.exportDocumentSet.findFirst({ where: { id, companyId: g.companyId }, select: detailSelect });
  if (!set) return NextResponse.json({ error: "Не е намерена." }, { status: 404 });
  return NextResponse.json(set);
}

const optDate = z.string().datetime().nullable().optional().or(z.literal("").transform(() => null));
const patchSchema = z.object({
  invoiceNumber: z.string().max(60).optional(),
  invoiceDate: optDate,
  destination: z.string().max(200).nullable().optional(),
  truckVehicleId: z.string().nullable().optional(),
  trailerReg: z.string().max(40).nullable().optional(),
  logisticsProductId: z.string().nullable().optional(),
  quantity: z.number().positive().nullable().optional(),
  unit: z.string().max(20).optional(),
  declarationCmrDate: optDate,
  dispatchNumber: z.string().max(60).nullable().optional(),
  clientId: z.string().nullable().optional(),
  note: z.string().max(2000).nullable().optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await logisticsApiGuard("manage_documents");
  if (!g.ok) return g.res;
  try {
    const { id } = await params;
    const existing = await prisma.exportDocumentSet.findFirst({ where: { id, companyId: g.companyId }, select: { id: true } });
    if (!existing) return NextResponse.json({ error: "Не е намерена." }, { status: 404 });
    const d = patchSchema.parse(await req.json());

    const data: Record<string, unknown> = {};
    if (d.invoiceNumber !== undefined) data.invoiceNumber = d.invoiceNumber.trim();
    if (d.invoiceDate !== undefined) data.invoiceDate = d.invoiceDate ? new Date(d.invoiceDate) : null;
    if (d.destination !== undefined) data.destination = d.destination;
    if (d.trailerReg !== undefined) data.trailerReg = d.trailerReg;
    if (d.quantity !== undefined) data.quantity = d.quantity;
    if (d.unit !== undefined) data.unit = d.unit;
    if (d.declarationCmrDate !== undefined) data.declarationCmrDate = d.declarationCmrDate ? new Date(d.declarationCmrDate) : null;
    if (d.dispatchNumber !== undefined) data.dispatchNumber = d.dispatchNumber;
    if (d.note !== undefined) data.note = d.note;
    if (d.clientId !== undefined) {
      if (d.clientId) { const c = await prisma.client.findFirst({ where: { id: d.clientId, companyId: g.companyId }, select: { id: true } }); if (!c) return NextResponse.json({ error: "Клиентът не е намерен." }, { status: 404 }); }
      data.clientId = d.clientId || null;
    }
    if (d.truckVehicleId !== undefined) {
      if (d.truckVehicleId) {
        const v = await prisma.vehicle.findFirst({ where: { id: d.truckVehicleId, companyId: g.companyId }, select: { registration: true, logisticsProfile: { select: { trailerReg: true } } } });
        if (!v) return NextResponse.json({ error: "Автомобилът не е намерен." }, { status: 404 });
        data.truckVehicleId = d.truckVehicleId; data.truckRegSnapshot = v.registration;
        if (d.trailerReg === undefined && v.logisticsProfile?.trailerReg) data.trailerReg = v.logisticsProfile.trailerReg;
      } else { data.truckVehicleId = null; data.truckRegSnapshot = null; }
    }
    if (d.logisticsProductId !== undefined) {
      if (d.logisticsProductId) { const p = await prisma.logisticsProduct.findFirst({ where: { id: d.logisticsProductId, companyId: g.companyId }, select: { canonicalName: true } }); if (!p) return NextResponse.json({ error: "Продуктът не е намерен." }, { status: 404 }); data.logisticsProductId = d.logisticsProductId; data.productSnapshot = p.canonicalName; }
      else { data.logisticsProductId = null; data.productSnapshot = null; }
    }

    await prisma.exportDocumentSet.update({ where: { id }, data });
    await audit(g.companyId, g.userId, "update", "ExportDocumentSet", id, "Редакция на основни данни");
    const fresh = await prisma.exportDocumentSet.findUnique({ where: { id }, select: detailSelect });
    return NextResponse.json(fresh);
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") return NextResponse.json({ error: "Фактура с този номер вече съществува." }, { status: 409 });
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.issues[0]?.message ?? "Невалидни данни." }, { status: 400 });
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}
