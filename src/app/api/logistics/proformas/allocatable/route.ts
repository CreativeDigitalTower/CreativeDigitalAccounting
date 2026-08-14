import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logisticsApiGuard } from "@/lib/logistics/access";

// Курсове, които могат да бъдат приспаднати от проформа: имат нето и още не са
// приспаднати от друга проформа.
export async function GET() {
  const g = await logisticsApiGuard("view_logistics");
  if (!g.ok) return g.res;
  const shipments = await prisma.shipment.findMany({
    where: { companyId: g.companyId, deletedAt: null, netQuantity: { gt: 0 }, proformaAllocation: null },
    select: { id: true, code: true, dispatchNoteNumber: true, netQuantity: true, unit: true, productNameSnapshot: true },
    orderBy: { dispatchDate: "asc" },
  });
  return NextResponse.json(shipments);
}
