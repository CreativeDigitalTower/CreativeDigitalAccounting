import { requireFashionProduction } from "@/lib/fashion/access";
import { prisma } from "@/lib/prisma";
import { seedFashionCategories } from "@/lib/fashion/categories";
import { MaterialsClient } from "@/components/app/fashion/MaterialsClient";

export default async function Page() {
  const { companyId, caps } = await requireFashionProduction();
  const count = await prisma.fashionMaterialCategory.count({ where: { companyId } });
  if (count === 0) await seedFashionCategories(companyId);
  const [categories, suppliers] = await Promise.all([
    prisma.fashionMaterialCategory.findMany({ where: { companyId, active: true }, select: { id: true, name: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
    prisma.supplier.findMany({ where: { companyId }, select: { id: true, name: true }, orderBy: { name: "asc" }, take: 1000 }),
  ]);
  return <MaterialsClient categories={categories} suppliers={suppliers} canManage={caps.manage_materials} />;
}
