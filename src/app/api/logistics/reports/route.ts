import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logisticsApiGuard } from "@/lib/logistics/access";
import { volumeByCargo, byProduct, byTruck, byCarrier, type ReportSet, type TruckMeta } from "@/lib/logistics/reports";

// Логистични отчети (§37): обем BULK/BAGS, по продукт, по влекач (натовареност),
// по превозвач. Company-scoped, read-only. Филтри: период (from/to по invoiceDate,
// fallback createdAt) + статус.
export async function GET(req: Request) {
  const g = await logisticsApiGuard("view_logistics");
  if (!g.ok) return g.res;
  const url = new URL(req.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const status = url.searchParams.get("status") || undefined;

  // Период по фактурна дата, а при липса — по дата на създаване (OR).
  const dateFilter = (from || to)
    ? {
        OR: [
          { invoiceDate: { ...(from ? { gte: new Date(from) } : {}), ...(to ? { lte: new Date(`${to}T23:59:59`) } : {}) } },
          { AND: [{ invoiceDate: null }, { createdAt: { ...(from ? { gte: new Date(from) } : {}), ...(to ? { lte: new Date(`${to}T23:59:59`) } : {}) } }] },
        ],
      }
    : {};

  const sets = await prisma.exportDocumentSet.findMany({
    where: { companyId: g.companyId, ...(status ? { status } : {}), ...dateFilter },
    select: { truckVehicleId: true, truckRegSnapshot: true, productSnapshot: true, quantity: true },
    take: 20000,
  });

  const reportSets: ReportSet[] = sets.map((s) => ({
    truckVehicleId: s.truckVehicleId, truckReg: s.truckRegSnapshot, product: s.productSnapshot, quantity: s.quantity,
  }));

  // Метаданни за влекачите от конфигурациите: еднозначен превозвач (иначе null) +
  // капацитет = макс. измежду конфигурациите. Само за влекачите в отчета.
  const vehicleIds = [...new Set(sets.map((s) => s.truckVehicleId).filter((x): x is string => !!x))];
  const meta = new Map<string, TruckMeta>();
  if (vehicleIds.length) {
    const cfgs = await prisma.vehicleConfiguration.findMany({
      where: { companyId: g.companyId, vehicleId: { in: vehicleIds }, active: true },
      select: { vehicleId: true, maxPayloadTons: true, carrier: { select: { name: true } } },
    });
    const agg = new Map<string, { carriers: Set<string>; maxPayload: number | null }>();
    for (const c of cfgs) {
      const cur = agg.get(c.vehicleId) ?? { carriers: new Set<string>(), maxPayload: null };
      if (c.carrier?.name) cur.carriers.add(c.carrier.name);
      if (c.maxPayloadTons != null) cur.maxPayload = Math.max(cur.maxPayload ?? 0, c.maxPayloadTons);
      agg.set(c.vehicleId, cur);
    }
    for (const [vid, a] of agg) {
      meta.set(vid, { carrierName: a.carriers.size === 1 ? [...a.carriers][0] : null, maxPayloadTons: a.maxPayload });
    }
  }

  return NextResponse.json({
    totalDeliveries: reportSets.length,
    volume: volumeByCargo(reportSets),
    byProduct: byProduct(reportSets),
    byTruck: byTruck(reportSets, meta),
    byCarrier: byCarrier(reportSets, meta),
  });
}
