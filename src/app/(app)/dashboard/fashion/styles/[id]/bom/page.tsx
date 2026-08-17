import { requireFashionProduction } from "@/lib/fashion/access";
import { prisma } from "@/lib/prisma";
import { StyleBomEditor } from "@/components/app/fashion/StyleBomEditor";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { companyId, caps } = await requireFashionProduction();
  const { id } = await params;
  const materials = await prisma.fashionMaterial.findMany({
    where: { companyId, active: true }, select: { id: true, name: true, unit: true, avgCost: true }, orderBy: { name: "asc" }, take: 2000,
  });
  return <StyleBomEditor styleId={id} materials={materials} canManage={caps.manage_bom} />;
}
