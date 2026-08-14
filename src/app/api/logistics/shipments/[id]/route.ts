import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logisticsApiGuard } from "@/lib/logistics/access";
import { audit } from "@/lib/documents";
import { computeNet } from "@/lib/logistics/shipmentCalc";
import { z } from "zod";

const detailSelect = {
  id: true, code: true, dispatchNoteNumber: true, dispatchDate: true, supplierId: true, status: true,
  vehicleId: true, vehicleRegSnapshot: true, trailerReg: true, carrierId: true, carrierSnapshot: true, driver: true,
  productId: true, productNameSnapshot: true, materialCodeSnapshot: true, unit: true,
  grossWeight: true, tara: true, netQuantity: true,
  contract: true, clientNumber: true, factory: true, loadingPlace: true, entryAt: true, exitAt: true,
  incoterm: true, destination: true, recipient: true, note: true, createdAt: true,
  statusHistory: { select: { id: true, fromStatus: true, toStatus: true, note: true, createdAt: true }, orderBy: { createdAt: "desc" as const } },
} as const;

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await logisticsApiGuard("view_logistics");
  if (!g.ok) return g.res;
  const { id } = await params;
  const shipment = await prisma.shipment.findFirst({ where: { id, companyId: g.companyId, deletedAt: null }, select: detailSelect });
  if (!shipment) return NextResponse.json({ error: "Не е намерен." }, { status: 404 });
  return NextResponse.json(shipment);
}

const optDate = z.string().datetime().nullable().optional().or(z.literal("").transform(() => null));
const patchSchema = z.object({
  dispatchNoteNumber: z.string().max(120).nullable().optional(),
  trailerReg: z.string().max(40).nullable().optional(),
  driver: z.string().max(120).nullable().optional(),
  grossWeight: z.number().nonnegative().nullable().optional(),
  tara: z.number().nonnegative().nullable().optional(),
  netQuantity: z.number().positive().nullable().optional(),
  contract: z.string().max(120).nullable().optional(),
  clientNumber: z.string().max(120).nullable().optional(),
  factory: z.string().max(200).nullable().optional(),
  loadingPlace: z.string().max(200).nullable().optional(),
  entryAt: optDate,
  exitAt: optDate,
  incoterm: z.string().max(20).nullable().optional(),
  destination: z.string().max(200).nullable().optional(),
  recipient: z.string().max(200).nullable().optional(),
  note: z.string().max(4000).nullable().optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await logisticsApiGuard("manage_shipments");
  if (!g.ok) return g.res;
  try {
    const { id } = await params;
    const existing = await prisma.shipment.findFirst({ where: { id, companyId: g.companyId, deletedAt: null }, select: { id: true, grossWeight: true, tara: true } });
    if (!existing) return NextResponse.json({ error: "Не е намерен." }, { status: 404 });
    const d = patchSchema.parse(await req.json());

    const data: Record<string, unknown> = {};
    for (const k of ["dispatchNoteNumber", "trailerReg", "driver", "contract", "clientNumber", "factory", "loadingPlace", "incoterm", "destination", "recipient", "note"] as const) {
      if (d[k] !== undefined) data[k] = d[k];
    }
    if (d.entryAt !== undefined) data.entryAt = d.entryAt ? new Date(d.entryAt) : null;
    if (d.exitAt !== undefined) data.exitAt = d.exitAt ? new Date(d.exitAt) : null;
    if (d.grossWeight !== undefined) data.grossWeight = d.grossWeight;
    if (d.tara !== undefined) data.tara = d.tara;
    // Преизчисляване на нето при промяна на бруто/тара/явно нето.
    if (d.grossWeight !== undefined || d.tara !== undefined || d.netQuantity !== undefined) {
      const gross = d.grossWeight !== undefined ? d.grossWeight : existing.grossWeight;
      const tara = d.tara !== undefined ? d.tara : existing.tara;
      data.netQuantity = computeNet(gross, tara, d.netQuantity ?? undefined);
    }

    await prisma.shipment.update({ where: { id }, data });
    await audit(g.companyId, g.userId, "update", "Shipment", id, "Редакция на курс");
    const fresh = await prisma.shipment.findUnique({ where: { id }, select: detailSelect });
    return NextResponse.json(fresh);
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.issues[0]?.message ?? "Невалидни данни." }, { status: 400 });
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}
