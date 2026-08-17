import { requireFashionProduction } from "@/lib/fashion/access";
import { prisma } from "@/lib/prisma";
import { seedFashionOperationCategories } from "@/lib/fashion/opCategories";
import { StyleOperationsEditor } from "@/components/app/fashion/StyleOperationsEditor";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { companyId, caps } = await requireFashionProduction();
  const { id } = await params;
  const count = await prisma.fashionOperationCategory.count({ where: { companyId } });
  if (count === 0) await seedFashionOperationCategories(companyId);
  const [categories, machines] = await Promise.all([
    prisma.fashionOperationCategory.findMany({ where: { companyId, active: true }, select: { id: true, name: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
    prisma.fashionMachine.findMany({ where: { companyId, active: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);
  return <StyleOperationsEditor styleId={id} categories={categories} machines={machines} canManage={caps.manage_production} />;
}
