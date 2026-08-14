import { requireLogistics } from "@/lib/logistics/access";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { ShipmentDetail, type ShipmentDto } from "@/components/app/logistics/ShipmentDetail";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { companyId, caps } = await requireLogistics();
  const { id } = await params;
  const s = await prisma.shipment.findFirst({
    where: { id, companyId, deletedAt: null },
    select: {
      id: true, code: true, dispatchNoteNumber: true, dispatchDate: true, status: true,
      vehicleRegSnapshot: true, trailerReg: true, carrierSnapshot: true, driver: true,
      productNameSnapshot: true, materialCodeSnapshot: true, unit: true,
      grossWeight: true, tara: true, netQuantity: true,
      contract: true, clientNumber: true, factory: true, loadingPlace: true, entryAt: true, exitAt: true,
      incoterm: true, destination: true, recipient: true, note: true, createdAt: true,
      statusHistory: { select: { id: true, fromStatus: true, toStatus: true, note: true, createdAt: true }, orderBy: { createdAt: "desc" } },
    },
  });
  if (!s) notFound();

  const dto: ShipmentDto = {
    ...s,
    dispatchDate: s.dispatchDate?.toISOString() ?? null,
    entryAt: s.entryAt?.toISOString() ?? null,
    exitAt: s.exitAt?.toISOString() ?? null,
    createdAt: s.createdAt.toISOString(),
    statusHistory: s.statusHistory.map((h) => ({ ...h, createdAt: h.createdAt.toISOString() })),
  };
  return <ShipmentDetail shipment={dto} canManage={caps.manage_shipments} />;
}
