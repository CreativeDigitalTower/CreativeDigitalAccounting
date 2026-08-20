import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logisticsApiGuard } from "@/lib/logistics/access";
import { fleetGaps, fleetReviewSummary } from "@/lib/logistics/fleet";

// Импорт-преглед (§34): обобщение на липсващите данни след импорта + списък само на
// конфигурациите, които се нуждаят от ръчно допълване. Company-scoped, read-only.
// По подразбиране връща само непълните редове; ?all=1 връща всички.
export async function GET(req: Request) {
  const g = await logisticsApiGuard("view_logistics");
  if (!g.ok) return g.res;
  const all = new URL(req.url).searchParams.get("all") === "1";

  const rows = await prisma.vehicleConfiguration.findMany({
    where: { companyId: g.companyId },
    include: {
      vehicle: { select: { registration: true } },
      carrier: { select: { name: true } },
    },
    orderBy: [{ carrier: { name: "asc" } }, { vehicle: { registration: "asc" } }],
    take: 5000,
  });

  const mapped = rows.map((r) => {
    const view = {
      id: r.id,
      truck: r.vehicle.registration,
      trailer: r.trailerReg,
      carrierId: r.carrierId,
      carrierName: r.carrier?.name ?? null,
      driver: r.defaultDriver,
      driverPhone: r.driverPhone,
      cargoMode: r.cargoMode,
      maxPayloadTons: r.maxPayloadTons,
      active: r.active,
      notes: r.notes,
    };
    return { ...view, gaps: fleetGaps(view) };
  });

  const summary = fleetReviewSummary(mapped);
  const list = all ? mapped : mapped.filter((r) => r.gaps.length > 0);
  return NextResponse.json({ summary, rows: list });
}
