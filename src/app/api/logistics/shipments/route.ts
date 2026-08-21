import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { logisticsApiGuard } from "@/lib/logistics/access";
import { audit } from "@/lib/documents";
import { nextSequenceValue } from "@/lib/logistics/sequence";
import { SEQ_SCOPE, formatShipmentId, DEFAULT_SHIPMENT_STATUS } from "@/lib/logistics/config";
import { computeNet, validateShipmentCore } from "@/lib/logistics/shipmentCalc";
import { shipmentDelayed } from "@/lib/logistics/transport";
import { validationError, zodFieldErrors, VMSG } from "@/lib/logistics/validation";
import { z } from "zod";

const listSelect = {
  id: true, code: true, dispatchNoteNumber: true, dispatchDate: true, status: true,
  vehicleRegSnapshot: true, productNameSnapshot: true, netQuantity: true, unit: true,
  destination: true, createdAt: true,
  milestones: { select: { expectedFrom: true, expectedTo: true, actualAt: true } },
} as const;

export async function GET(req: Request) {
  const g = await logisticsApiGuard("view_logistics");
  if (!g.ok) return g.res;
  const status = new URL(req.url).searchParams.get("status");
  const shipments = await prisma.shipment.findMany({
    where: { companyId: g.companyId, deletedAt: null, ...(status ? { status } : {}) },
    select: listSelect, orderBy: { createdAt: "desc" }, take: 500,
  });
  const out = shipments.map(({ milestones, ...s }) => ({ ...s, delayed: shipmentDelayed(milestones) }));
  return NextResponse.json(out);
}

const optDate = z.string().datetime().nullable().optional().or(z.literal("").transform(() => null));
const schema = z.object({
  dispatchNoteNumber: z.string().max(120).nullable().optional(),
  dispatchDate: z.string().datetime().or(z.string().min(1, VMSG.date)), // критично
  supplierId: z.string().nullable().optional(),
  vehicleId: z.string().min(1, VMSG.vehicle),          // критично
  trailerReg: z.string().max(40).nullable().optional(),
  carrierId: z.string().nullable().optional(),
  driver: z.string().max(120).nullable().optional(),
  productId: z.string().min(1, VMSG.product),          // критично
  grossWeight: z.number().nonnegative().nullable().optional(),
  tara: z.number().nonnegative().nullable().optional(),
  netQuantity: z.number().positive().nullable().optional(),
  unit: z.string().max(20).optional(),
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

export async function POST(req: Request) {
  const g = await logisticsApiGuard("manage_shipments");
  if (!g.ok) return g.res;
  try {
    const d = schema.parse(await req.json());

    // Автомобил + продукт: проверка за собственост (IDOR) + snapshot данни.
    const [vehicle, product, carrier, supplier] = await Promise.all([
      prisma.vehicle.findFirst({ where: { id: d.vehicleId, companyId: g.companyId }, select: { id: true, registration: true, logisticsProfile: { select: { trailerReg: true, carrierId: true, defaultDriver: true } } } }),
      prisma.logisticsProduct.findFirst({ where: { id: d.productId, companyId: g.companyId }, select: { id: true, canonicalName: true, materialCode: true, unit: true } }),
      d.carrierId ? prisma.carrier.findFirst({ where: { id: d.carrierId, companyId: g.companyId }, select: { id: true, name: true } }) : Promise.resolve(null),
      d.supplierId ? prisma.supplier.findFirst({ where: { id: d.supplierId, companyId: g.companyId }, select: { id: true } }) : Promise.resolve(null),
    ]);
    if (!vehicle) return NextResponse.json({ error: "Автомобилът не е намерен." }, { status: 404 });
    if (!product) return NextResponse.json({ error: "Продуктът не е намерен." }, { status: 404 });
    if (d.carrierId && !carrier) return NextResponse.json({ error: "Превозвачът не е намерен." }, { status: 404 });
    if (d.supplierId && !supplier) return NextResponse.json({ error: "Доставчикът не е намерен." }, { status: 404 });

    const net = computeNet(d.grossWeight, d.tara, d.netQuantity);
    const v = validateShipmentCore({ dispatchDate: d.dispatchDate, vehicleId: vehicle.id, productId: product.id, netQuantity: net });
    if (!v.ok) return validationError({ net: net == null || !(net > 0) ? VMSG.quantity : (v.error ?? VMSG.quantity) });

    const dispatchDate = new Date(d.dispatchDate);
    const year = dispatchDate.getFullYear();
    const unit = d.unit || product.unit || "t";

    // Атомарно: номер + курс + начален статус в една транзакция (concurrency-safe).
    const shipment = await prisma.$transaction(async (tx) => {
      const val = await nextSequenceValue(tx, g.companyId, SEQ_SCOPE.shipment, { year });
      const code = formatShipmentId(year, val);
      const s = await tx.shipment.create({
        data: {
          companyId: g.companyId, code, seqYear: year, seqValue: val,
          dispatchNoteNumber: d.dispatchNoteNumber || null, dispatchDate, supplierId: supplier?.id ?? null,
          vehicleId: vehicle.id, vehicleRegSnapshot: vehicle.registration,
          trailerReg: d.trailerReg ?? vehicle.logisticsProfile?.trailerReg ?? null,
          carrierId: carrier?.id ?? vehicle.logisticsProfile?.carrierId ?? null,
          carrierSnapshot: carrier?.name ?? null,
          driver: d.driver ?? vehicle.logisticsProfile?.defaultDriver ?? null,
          productId: product.id, productNameSnapshot: product.canonicalName, materialCodeSnapshot: product.materialCode,
          unit, grossWeight: d.grossWeight ?? null, tara: d.tara ?? null, netQuantity: net,
          contract: d.contract ?? null, clientNumber: d.clientNumber ?? null, factory: d.factory ?? null,
          loadingPlace: d.loadingPlace ?? null, entryAt: d.entryAt ? new Date(d.entryAt) : null,
          exitAt: d.exitAt ? new Date(d.exitAt) : null, incoterm: d.incoterm ?? null,
          destination: d.destination ?? null, recipient: d.recipient ?? null,
          status: DEFAULT_SHIPMENT_STATUS, note: d.note ?? null, createdById: g.userId,
        },
        select: { id: true, code: true },
      });
      await tx.shipmentStatusHistory.create({ data: { shipmentId: s.id, toStatus: DEFAULT_SHIPMENT_STATUS, changedById: g.userId } });
      return s;
    });

    await audit(g.companyId, g.userId, "create", "Shipment", shipment.id, `Курс ${shipment.code} (${d.dispatchNoteNumber ?? "—"})`);
    return NextResponse.json(shipment);
  } catch (err) {
    // Дублирана експедиционна бележка (unique [companyId, dispatchNoteNumber]).
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return NextResponse.json({ error: "Тази експедиционна бележка вече е въведена." }, { status: 409 });
    }
    if (err instanceof z.ZodError) return validationError(zodFieldErrors(err));
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}
