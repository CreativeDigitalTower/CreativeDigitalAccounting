import { requireLogistics } from "@/lib/logistics/access";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { VehicleDossier } from "@/components/app/logistics/VehicleDossier";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { companyId, caps } = await requireLogistics();
  const { id } = await params;
  const [v, carriers] = await Promise.all([
    prisma.vehicle.findFirst({
      where: { id, companyId },
      select: {
        id: true, registration: true, active: true, notes: true,
        logisticsProfile: { select: { trailerReg: true, carrierId: true, defaultDriver: true, ownershipType: true } },
        aliases: { select: { id: true, alias: true } },
      },
    }),
    prisma.carrier.findMany({ where: { companyId, active: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);
  if (!v) notFound();
  return <VehicleDossier vehicle={v} carriers={carriers} canManage={caps.manage_shipments} canDocs={caps.manage_documents} />;
}
