import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logisticsApiGuard } from "@/lib/logistics/access";
import { normalizeRegistration } from "@/lib/logistics/normalize";

// Списък транспортни конфигурации (§26, §27). Company-scoped. Филтри: carrierId,
// cargoMode, driver, truck, trailer, active + търсене по рег. номер.
export async function GET(req: Request) {
  const g = await logisticsApiGuard("view_logistics");
  if (!g.ok) return g.res;
  const url = new URL(req.url);
  const carrierId = url.searchParams.get("carrierId") || undefined;
  const cargoMode = url.searchParams.get("cargoMode") || undefined;
  const activeParam = url.searchParams.get("active");
  const q = url.searchParams.get("q")?.trim() || "";
  const qNorm = normalizeRegistration(q);

  const rows = await prisma.vehicleConfiguration.findMany({
    where: {
      companyId: g.companyId,
      ...(carrierId ? { carrierId } : {}),
      ...(cargoMode ? { cargoMode } : {}),
      ...(activeParam === "1" ? { active: true } : activeParam === "0" ? { active: false } : {}),
    },
    include: { vehicle: { select: { registration: true, normalizedRegistration: true } }, carrier: { select: { name: true } } },
    orderBy: [{ carrier: { name: "asc" } }, { vehicle: { registration: "asc" } }],
    take: 5000,
  });

  let list = rows.map((r) => ({
    id: r.id, truck: r.vehicle.registration, trailer: r.trailerReg, carrierId: r.carrierId, carrierName: r.carrier?.name ?? null,
    driver: r.defaultDriver, driverPhone: r.driverPhone, cargoMode: r.cargoMode, maxPayloadTons: r.maxPayloadTons, active: r.active,
    _tn: r.vehicle.normalizedRegistration ?? "", _rn: r.trailerRegNorm, _dr: (r.defaultDriver ?? "").toLowerCase(),
  }));
  const driver = url.searchParams.get("driver")?.trim().toLowerCase();
  const truck = url.searchParams.get("truck")?.trim();
  const trailer = url.searchParams.get("trailer")?.trim();
  if (driver) list = list.filter((x) => x._dr.includes(driver));
  if (truck) { const tn = normalizeRegistration(truck); list = list.filter((x) => x._tn.includes(tn)); }
  if (trailer) { const rn = normalizeRegistration(trailer); list = list.filter((x) => x._rn.includes(rn)); }
  if (q) list = list.filter((x) => x._tn.includes(qNorm) || x._rn.includes(qNorm) || `${x.truck} ${x.trailer ?? ""}`.toLowerCase().includes(q.toLowerCase()) || x._dr.includes(q.toLowerCase()));

  return NextResponse.json(list.map(({ _tn, _rn, _dr, ...r }) => r));
}
