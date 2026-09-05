import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logisticsApiGuard } from "@/lib/logistics/access";
import { isPeriodKey, resolvePeriodRange } from "@/lib/logistics/period";
import { summarizeTrips, bucketByMonth, bucketByYear } from "@/lib/logistics/tripStats";

// Статистика на автомобил от експортните доставки (§10-§14). Company-scoped; soft-deleted
// НЕ участва (§42); архивиран автомобил пази историята си (§15 — не филтрираме по active).
// Зарежда само минимални полета (дата+количество) — без attachments/binary (§29).
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await logisticsApiGuard("view_logistics");
  if (!g.ok) return g.res;
  const { id } = await params;
  const veh = await prisma.vehicle.findFirst({ where: { id, companyId: g.companyId }, select: { id: true } });
  if (!veh) return NextResponse.json({ error: "Не е намерен." }, { status: 404 });

  const sp = new URL(req.url).searchParams;
  const periodKey = isPeriodKey(sp.get("period")) ? sp.get("period")! : "all_time";
  const range = resolvePeriodRange(periodKey as never, { from: sp.get("from"), to: sp.get("to") });

  const sets = await prisma.exportDocumentSet.findMany({
    where: { companyId: g.companyId, truckVehicleId: id, deletedAt: null },
    select: { shipmentDate: true, invoiceDate: true, quantity: true },
  });
  const rows = sets.map((s) => ({ date: s.shipmentDate ?? s.invoiceDate ?? null, quantity: s.quantity }));
  const inRange = rows.filter((r) => {
    if (!r.date) return !range.from && !range.to;
    const t = r.date.getTime();
    if (range.from && t < range.from.getTime()) return false;
    if (range.to && t > range.to.getTime()) return false;
    return true;
  });

  return NextResponse.json({
    allTime: summarizeTrips(rows),
    period: { key: periodKey, ...summarizeTrips(inRange) },
    monthly: bucketByMonth(rows, 12),
    yearly: bucketByYear(rows),
  });
}
