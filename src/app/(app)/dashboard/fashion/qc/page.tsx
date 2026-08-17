import { requireFashionProduction } from "@/lib/fashion/access";
import { prisma } from "@/lib/prisma";
import { QcOverview } from "@/components/app/fashion/QcOverview";

export default async function Page() {
  const { companyId, caps } = await requireFashionProduction();
  const styles = await prisma.fashionStyle.findMany({
    where: { companyId, status: { notIn: ["archived"] } }, select: { id: true, code: true, name: true, sizes: true, colors: true }, orderBy: { code: "asc" }, take: 2000,
  });
  const materials = await prisma.fashionMaterial.findMany({ where: { companyId, active: true }, select: { id: true, name: true, unit: true }, orderBy: { name: "asc" }, take: 2000 });
  return <QcOverview styles={styles} materials={materials} canManageSamples={caps.manage_production} />;
}
