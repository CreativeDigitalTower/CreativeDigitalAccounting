import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logisticsApiGuard } from "@/lib/logistics/access";

// Нефактурирани експедиции: курсове с нето количество, които още не са включени в
// нито една Holcim фактура. Използва се от екрана „Добави фактура от Holcim".
export async function GET() {
  const g = await logisticsApiGuard("view_logistics");
  if (!g.ok) return g.res;
  const shipments = await prisma.shipment.findMany({
    where: { companyId: g.companyId, deletedAt: null, netQuantity: { gt: 0 }, invoiceLinks: { none: {} } },
    select: { id: true, code: true, dispatchNoteNumber: true, dispatchDate: true, vehicleRegSnapshot: true, productNameSnapshot: true, netQuantity: true, unit: true },
    orderBy: { dispatchDate: "asc" },
  });
  return NextResponse.json(shipments);
}
