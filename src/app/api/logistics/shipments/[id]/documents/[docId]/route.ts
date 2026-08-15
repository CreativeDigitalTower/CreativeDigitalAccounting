import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logisticsApiGuard } from "@/lib/logistics/access";
import { audit } from "@/lib/documents";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string; docId: string }> }) {
  const g = await logisticsApiGuard("manage_documents");
  if (!g.ok) return g.res;
  const { id, docId } = await params;
  const doc = await prisma.shipmentDocument.findFirst({
    where: { id: docId, shipmentId: id, deletedAt: null, shipment: { companyId: g.companyId } }, select: { id: true },
  });
  if (!doc) return NextResponse.json({ error: "Не е намерен." }, { status: 404 });
  await prisma.shipmentDocument.update({ where: { id: docId }, data: { deletedAt: new Date() } });
  await audit(g.companyId, g.userId, "delete", "ShipmentDocument", docId, `Изтрит документ на курс ${id}`);
  return NextResponse.json({ success: true });
}
