import { requireLogistics } from "@/lib/logistics/access";
import { prisma } from "@/lib/prisma";
import { LogisticsProformas } from "@/components/app/logistics/LogisticsProformas";

export default async function Page() {
  const { companyId, caps } = await requireLogistics();
  const products = await prisma.logisticsProduct.findMany({ where: { companyId, active: true }, select: { id: true, canonicalName: true }, orderBy: { canonicalName: "asc" } });
  return <LogisticsProformas canManage={caps.manage_rates} products={products} />;
}
