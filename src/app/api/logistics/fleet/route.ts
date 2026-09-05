import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logisticsApiGuard } from "@/lib/logistics/access";
import { normalizeRegistration } from "@/lib/logistics/normalize";
import { buildFleetView } from "@/lib/logistics/fleet";
import { isPeriodKey, resolvePeriodRange, prismaDateFilter } from "@/lib/logistics/period";

// Обединен изглед „Автопарк" (§2/§18): master Vehicle + неговите VehicleConfiguration-и,
// плюс аналитика от експортните доставки (курсове/количество за избрания период, §2-§9).
// Всичко server-side, агрегирано с groupBy/aggregate (без N+1, без зареждане на всички
// доставки). НЕ трие/дублира записи — само проекция.
export async function GET(req: Request) {
  const g = await logisticsApiGuard("view_logistics");
  if (!g.ok) return g.res;
  const sp = new URL(req.url).searchParams;
  const includeArchived = sp.get("archived") === "1";
  const periodKey = isPeriodKey(sp.get("period")) ? sp.get("period")! : "all_time";
  const range = resolvePeriodRange(periodKey as never, { from: sp.get("from"), to: sp.get("to") });
  const dateFilter = prismaDateFilter(range);
  const hasDate = Object.keys(dateFilter).length > 0;

  const [vehicles, carriers, tripAgg, periodTotals] = await Promise.all([
    prisma.vehicle.findMany({
      where: { companyId: g.companyId, normalizedRegistration: { not: null }, ...(includeArchived ? {} : { active: true }) },
      select: {
        id: true, registration: true, active: true, notes: true,
        logisticsProfile: { select: { ownershipType: true } },
        aliases: { select: { alias: true } },
        configurations: { select: { id: true, trailerReg: true, carrierId: true, defaultDriver: true, driverPhone: true, cargoMode: true, maxPayloadTons: true, active: true } },
      },
      orderBy: { registration: "asc" }, take: 5000,
    }),
    prisma.carrier.findMany({ where: { companyId: g.companyId }, select: { id: true, name: true } }),
    // Курсове/количество по автомобил за периода — soft-deleted НЕ участва (§42).
    prisma.exportDocumentSet.groupBy({
      by: ["truckVehicleId"],
      where: { companyId: g.companyId, deletedAt: null, truckVehicleId: { not: null }, ...(hasDate ? { shipmentDate: dateFilter } : {}) },
      _count: { _all: true }, _sum: { quantity: true }, _max: { shipmentDate: true, invoiceDate: true },
    }),
    // KPI за периода: общо доставки + превозено количество (§9).
    prisma.exportDocumentSet.aggregate({
      where: { companyId: g.companyId, deletedAt: null, ...(hasDate ? { shipmentDate: dateFilter } : {}) },
      _count: { _all: true }, _sum: { quantity: true },
    }),
  ]);

  const round3 = (n: number) => Math.round(n * 1000) / 1000;
  const tripMap = new Map(tripAgg.map((a) => [a.truckVehicleId as string, {
    trips: a._count._all,
    quantity: round3(a._sum.quantity ?? 0),
    lastDelivery: (a._max.shipmentDate ?? a._max.invoiceDate ?? null)?.toISOString() ?? null,
  }]));

  const carrierName = new Map(carriers.map((c) => [c.id, c.name]));
  const view = buildFleetView(
    vehicles.map((v) => ({
      id: v.id, registration: v.registration, active: v.active,
      ownershipType: v.logisticsProfile?.ownershipType ?? null,
      aliases: v.aliases.map((a) => a.alias),
      configs: v.configurations.map((c) => ({
        id: c.id, trailer: c.trailerReg,
        carrierName: c.carrierId ? (carrierName.get(c.carrierId) ?? null) : null,
        driver: c.defaultDriver, driverPhone: c.driverPhone,
        cargoMode: c.cargoMode, maxPayloadTons: c.maxPayloadTons, active: c.active,
      })),
    })),
    normalizeRegistration,
  );
  const rows = view.rows.map((r) => {
    const a = tripMap.get(r.id);
    return { ...r, trips: a?.trips ?? 0, tripQuantity: a?.quantity ?? 0, lastDelivery: a?.lastDelivery ?? null };
  });
  return NextResponse.json({
    kpi: view.kpi,
    period: { key: periodKey, trips: periodTotals._count._all, quantity: round3(periodTotals._sum.quantity ?? 0) },
    rows,
  });
}
