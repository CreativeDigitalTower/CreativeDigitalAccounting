import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logisticsApiGuard } from "@/lib/logistics/access";
import { normalizeRegistration } from "@/lib/logistics/normalize";
import { buildFleetView } from "@/lib/logistics/fleet";

// Обединен изглед „Автопарк" (§2/§18): master Vehicle + неговите VehicleConfiguration-и,
// агрегирани server-side в един query (без N+1). НЕ трие/дублира записи — само проекция.
export async function GET(req: Request) {
  const g = await logisticsApiGuard("view_logistics");
  if (!g.ok) return g.res;
  const includeArchived = new URL(req.url).searchParams.get("archived") === "1";
  const [vehicles, carriers] = await Promise.all([
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
  ]);
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
  return NextResponse.json(view);
}
