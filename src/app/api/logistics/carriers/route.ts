import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logisticsApiGuard } from "@/lib/logistics/access";
import { audit } from "@/lib/documents";
import { resolvePeriod, aggregateCarrierOverview, type TripAgg } from "@/lib/logistics/carrierAnalytics";
import { z } from "zod";

const select = { id: true, name: true, eik: true, contact: true, phone: true, email: true, note: true, active: true } as const;

/** Списък превозвачи + аналитика за период (§1/§2/§13). Company-scoped; без N+1 (groupBy). */
export async function GET(req: Request) {
  const g = await logisticsApiGuard("view_logistics");
  if (!g.ok) return g.res;
  const sp = new URL(req.url).searchParams;
  const period = resolvePeriod(sp.get("range") ?? "all", sp.get("from"), sp.get("to"));
  const dateWhere = period ? { shipmentDate: { gte: period.gte, lt: period.lt } } : {};

  const [carriers, vehicles, tripAgg] = await Promise.all([
    prisma.carrier.findMany({ where: { companyId: g.companyId }, select, orderBy: { name: "asc" } }),
    // Автомобил → текущ превозвач (VehicleLogisticsProfile.carrierId). Company-scoped.
    prisma.vehicle.findMany({ where: { companyId: g.companyId }, select: { id: true, active: true, logisticsProfile: { select: { carrierId: true } } } }),
    // Превози/количество по автомобил за периода (canonical = ExportDocumentSet, без trash).
    prisma.exportDocumentSet.groupBy({
      by: ["truckVehicleId"],
      where: { companyId: g.companyId, deletedAt: null, truckVehicleId: { not: null }, ...dateWhere },
      _count: { _all: true }, _sum: { quantity: true }, _max: { shipmentDate: true, invoiceDate: true },
    }),
  ]);

  const trips: TripAgg[] = tripAgg.map((a) => ({
    truckVehicleId: a.truckVehicleId,
    trips: a._count._all,
    quantity: a._sum.quantity ?? 0,
    lastDelivery: (a._max.shipmentDate ?? a._max.invoiceDate ?? null)?.toISOString() ?? null,
  }));
  const overview = aggregateCarrierOverview(
    carriers.map((c) => ({ id: c.id, name: c.name, active: c.active, eik: c.eik, contact: c.contact, phone: c.phone })),
    vehicles.map((v) => ({ vehicleId: v.id, carrierId: v.logisticsProfile?.carrierId ?? null, active: v.active })),
    trips,
  );
  return NextResponse.json(overview);
}

const schema = z.object({
  name: z.string().min(1).max(200),
  eik: z.string().max(40).nullable().optional(),
  contact: z.string().max(200).nullable().optional(),
  phone: z.string().max(60).nullable().optional(),
  email: z.string().max(200).nullable().optional(),
  note: z.string().max(2000).nullable().optional(),
});

export async function POST(req: Request) {
  const g = await logisticsApiGuard("manage_rates");
  if (!g.ok) return g.res;
  try {
    const d = schema.parse(await req.json());
    const carrier = await prisma.carrier.create({ data: { companyId: g.companyId, ...d }, select });
    await audit(g.companyId, g.userId, "create", "Carrier", carrier.id, `Превозвач „${d.name}"`);
    return NextResponse.json(carrier);
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Невалидни данни." }, { status: 400 });
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}
