import { requireFashionProduction } from "@/lib/fashion/access";
import { prisma } from "@/lib/prisma";
import { DeliveriesClient } from "@/components/app/fashion/DeliveriesClient";

export default async function Page() {
  const { companyId, caps } = await requireFashionProduction();
  const [suppliers, materials] = await Promise.all([
    prisma.supplier.findMany({ where: { companyId }, select: { id: true, name: true }, orderBy: { name: "asc" }, take: 1000 }),
    prisma.fashionMaterial.findMany({ where: { companyId, active: true }, select: { id: true, name: true, unit: true, avgCost: true }, orderBy: { name: "asc" }, take: 2000 }),
  ]);
  return <DeliveriesClient suppliers={suppliers} materials={materials} canManage={caps.manage_deliveries} />;
}
