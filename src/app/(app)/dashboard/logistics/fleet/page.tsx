import { requireLogistics } from "@/lib/logistics/access";
import { prisma } from "@/lib/prisma";
import { FleetClient } from "@/components/app/logistics/FleetClient";

export default async function Page() {
  const { companyId, caps } = await requireLogistics();
  const carriers = await prisma.carrier.findMany({ where: { companyId, active: true }, select: { id: true, name: true }, orderBy: { name: "asc" } });
  return <FleetClient carriers={carriers} canManage={caps.manage_shipments} />;
}
