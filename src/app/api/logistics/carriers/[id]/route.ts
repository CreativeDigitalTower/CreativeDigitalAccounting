import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logisticsApiGuard } from "@/lib/logistics/access";
import { audit } from "@/lib/documents";
import { resolvePeriod, aggregateCarrierDetail, type DeliveryRow } from "@/lib/logistics/carrierAnalytics";
import { pickPrimaryConfig } from "@/lib/logistics/fleetReconcile";
import { canonicalDestinationKey } from "@/lib/logistics/destinations";
import { z } from "zod";

const carrierSelect = { id: true, name: true, eik: true, contact: true, phone: true, email: true, note: true, active: true } as const;

/**
 * Досие на превозвач: master + аналитика за период + текущи автомобили (§4/§5/§6/§8/§9/§11).
 * Company-scoped (IDOR guard). Canonical превоз = ExportDocumentSet; атрибуция по ТЕКУЩИЯ
 * превозвач на автомобила (без carrier snapshot на export set).
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await logisticsApiGuard("view_logistics");
  if (!g.ok) return g.res;
  const { id } = await params;

  const carrier = await prisma.carrier.findFirst({ where: { id, companyId: g.companyId }, select: carrierSelect });
  if (!carrier) return NextResponse.json({ error: "Не е намерен." }, { status: 404 });

  const sp = new URL(req.url).searchParams;
  const period = resolvePeriod(sp.get("range") ?? "all", sp.get("from"), sp.get("to"));
  const dateWhere = period ? { shipmentDate: { gte: period.gte, lt: period.lt } } : {};

  // Автомобили на превозвача (по текущия master profile.carrierId).
  const vehicles = await prisma.vehicle.findMany({
    where: { companyId: g.companyId, logisticsProfile: { carrierId: id } },
    select: {
      id: true, registration: true, active: true,
      logisticsProfile: { select: { trailerReg: true, defaultDriver: true } },
      configurations: { select: { id: true, maxPayloadTons: true, active: true, createdAt: true, trailerRegNorm: true } },
    },
    orderBy: { registration: "asc" },
  });
  const vehicleIds = vehicles.map((v) => v.id);

  // Доставки на тези автомобили за периода (canonical, без trash). Server-side агрегация.
  const sets = vehicleIds.length ? await prisma.exportDocumentSet.findMany({
    where: { companyId: g.companyId, deletedAt: null, truckVehicleId: { in: vehicleIds }, ...dateWhere },
    select: { id: true, shipmentDate: true, truckVehicleId: true, truckRegSnapshot: true, trailerReg: true, destination: true, productSnapshot: true, quantity: true, status: true },
    take: 20000,
  }) : [];
  const rows: DeliveryRow[] = sets.map((s) => ({
    id: s.id, shipmentDate: s.shipmentDate ? s.shipmentDate.toISOString() : null, truckVehicleId: s.truckVehicleId,
    truckReg: s.truckRegSnapshot, trailer: s.trailerReg, destination: s.destination,
    destKey: s.destination ? canonicalDestinationKey(s.destination) : null, product: s.productSnapshot,
    quantity: s.quantity, status: s.status,
  }));
  const stats = aggregateCarrierDetail(rows);

  // Per-vehicle агрегати за секция „Автомобили" (от същите rows) + текущи master данни.
  const byVeh = new Map(stats.byVehicle.map((v) => [v.vehicleId, v]));
  const vehicleView = vehicles.map((v) => {
    const primary = pickPrimaryConfig(v.configurations, "");
    const agg = byVeh.get(v.id);
    return {
      id: v.id, registration: v.registration, active: v.active,
      trailer: v.logisticsProfile?.trailerReg ?? null,
      driver: v.logisticsProfile?.defaultDriver ?? null,
      capacity: primary?.maxPayloadTons ?? null,
      trips: agg?.trips ?? 0, quantity: agg?.quantity ?? 0, lastDelivery: agg?.lastDelivery ?? null,
    };
  });

  return NextResponse.json({
    carrier,
    vehiclesActive: vehicles.filter((v) => v.active).length,
    vehiclesTotal: vehicles.length,
    stats,
    vehicles: vehicleView,
  });
}

const schema = z.object({
  name: z.string().min(1).max(200).optional(),
  eik: z.string().max(40).nullable().optional(),
  contact: z.string().max(200).nullable().optional(),
  phone: z.string().max(60).nullable().optional(),
  email: z.string().max(200).nullable().optional(),
  note: z.string().max(2000).nullable().optional(),
  active: z.boolean().optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await logisticsApiGuard("manage_rates");
  if (!g.ok) return g.res;
  try {
    const { id } = await params;
    const existing = await prisma.carrier.findFirst({ where: { id, companyId: g.companyId }, select: { id: true } });
    if (!existing) return NextResponse.json({ error: "Не е намерен." }, { status: 404 });
    const d = schema.parse(await req.json());
    const carrier = await prisma.carrier.update({
      where: { id }, data: d,
      select: { id: true, name: true, eik: true, contact: true, phone: true, email: true, note: true, active: true },
    });
    await audit(g.companyId, g.userId, "update", "Carrier", id, "Редакция на превозвач");
    return NextResponse.json(carrier);
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Невалидни данни." }, { status: 400 });
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}
