import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logisticsApiGuard } from "@/lib/logistics/access";

// Master data за smart-input при ръчно въвеждане на позиции: продукти (шифър→име),
// автомобили (+ aliases), и курсове по експедиционна бележка (за автоматичен matching).
export async function GET() {
  const g = await logisticsApiGuard("view_logistics");
  if (!g.ok) return g.res;
  const [products, vehicles, shipments] = await Promise.all([
    prisma.logisticsProduct.findMany({ where: { companyId: g.companyId, active: true }, select: { materialCode: true, canonicalName: true, unit: true }, orderBy: { canonicalName: "asc" } }),
    prisma.vehicle.findMany({ where: { companyId: g.companyId, active: true, normalizedRegistration: { not: null } }, select: { registration: true, aliases: { select: { alias: true } } } }),
    prisma.shipment.findMany({
      where: { companyId: g.companyId, deletedAt: null, dispatchNoteNumber: { not: null } },
      select: { id: true, code: true, dispatchNoteNumber: true, vehicleRegSnapshot: true, materialCodeSnapshot: true, netQuantity: true, unit: true, invoiceLinks: { select: { id: true } } },
      orderBy: { dispatchDate: "desc" }, take: 1000,
    }),
  ]);
  return NextResponse.json({
    products: products.filter((p) => p.materialCode).map((p) => ({ materialCode: p.materialCode, name: p.canonicalName, unit: p.unit })),
    vehicles: vehicles.map((v) => ({ registration: v.registration, aliases: v.aliases.map((a) => a.alias) })),
    dispatchNotes: shipments.map((s) => ({
      dispatchNoteNumber: s.dispatchNoteNumber, shipmentCode: s.code, truck: s.vehicleRegSnapshot,
      materialCode: s.materialCodeSnapshot, quantity: s.netQuantity, unit: s.unit, invoiced: s.invoiceLinks.length > 0,
    })),
  });
}
