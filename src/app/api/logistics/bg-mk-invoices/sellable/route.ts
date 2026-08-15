import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logisticsApiGuard } from "@/lib/logistics/access";

// Курсове, които BG фирмата може да продаде на MK: собствени, с нето количество, още
// невключени в BG→MK фактура. Носят продукт/количество (enter once → use everywhere).
export async function GET() {
  const g = await logisticsApiGuard("view_logistics");
  if (!g.ok) return g.res;
  const shipments = await prisma.shipment.findMany({
    where: { companyId: g.companyId, deletedAt: null, netQuantity: { gt: 0 }, bgMkLine: null },
    select: {
      id: true, code: true, productId: true, productNameSnapshot: true, netQuantity: true, unit: true,
      vehicleRegSnapshot: true, dispatchNoteNumber: true,
    },
    orderBy: { dispatchDate: "asc" }, take: 500,
  });
  return NextResponse.json(shipments);
}
