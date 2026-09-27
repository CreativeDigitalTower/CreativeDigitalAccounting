import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { logisticsApiGuard } from "@/lib/logistics/access";
import { resolvePeriod } from "@/lib/logistics/carrierAnalytics";

/**
 * История на превозите за превозвач (§7) — canonical = ExportDocumentSet за автомобилите му,
 * server-side pagination + период. Driver НЕ се показва като исторически (ExportDocumentSet
 * няма driver snapshot) → колоната се пропуска / е „—". Company-scoped (IDOR guard).
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await logisticsApiGuard("view_logistics");
  if (!g.ok) return g.res;
  const { id } = await params;

  const carrier = await prisma.carrier.findFirst({ where: { id, companyId: g.companyId }, select: { id: true } });
  if (!carrier) return NextResponse.json({ error: "Не е намерен." }, { status: 404 });

  const sp = new URL(req.url).searchParams;
  const page = Math.max(1, Number(sp.get("page")) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(sp.get("pageSize")) || 25));
  const period = resolvePeriod(sp.get("range") ?? "all", sp.get("from"), sp.get("to"));

  const vehicles = await prisma.vehicle.findMany({ where: { companyId: g.companyId, logisticsProfile: { carrierId: id } }, select: { id: true } });
  const vehicleIds = vehicles.map((v) => v.id);
  if (vehicleIds.length === 0) return NextResponse.json({ total: 0, page, pageSize, rows: [] });

  const where: Prisma.ExportDocumentSetWhereInput = {
    companyId: g.companyId, deletedAt: null, truckVehicleId: { in: vehicleIds },
    ...(period ? { shipmentDate: { gte: period.gte, lt: period.lt } } : {}),
  };
  const [total, sets] = await Promise.all([
    prisma.exportDocumentSet.count({ where }),
    prisma.exportDocumentSet.findMany({
      where,
      select: { id: true, shipmentDate: true, invoiceNumber: true, dispatchNumber: true, truckRegSnapshot: true, trailerReg: true, destination: true, productSnapshot: true, quantity: true, unit: true, status: true },
      orderBy: { shipmentDate: "desc" },
      skip: (page - 1) * pageSize, take: pageSize,
    }),
  ]);

  return NextResponse.json({
    total, page, pageSize,
    rows: sets.map((s) => ({
      id: s.id, shipmentDate: s.shipmentDate ? s.shipmentDate.toISOString() : null,
      invoiceNumber: s.invoiceNumber, dispatchNumber: s.dispatchNumber, truck: s.truckRegSnapshot, trailer: s.trailerReg,
      destination: s.destination, product: s.productSnapshot, quantity: s.quantity, unit: s.unit, status: s.status,
    })),
  });
}
