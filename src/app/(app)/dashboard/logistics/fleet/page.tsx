import { requireLogistics } from "@/lib/logistics/access";
import { prisma } from "@/lib/prisma";
import { UnifiedFleetClient } from "@/components/app/logistics/UnifiedFleetClient";

export default async function Page() {
  const { companyId, caps } = await requireLogistics();
  const carriers = await prisma.carrier.findMany({ where: { companyId, active: true }, select: { id: true, name: true }, orderBy: { name: "asc" } });
  return <UnifiedFleetClient carriers={carriers} canManage={caps.manage_shipments} />;
}
