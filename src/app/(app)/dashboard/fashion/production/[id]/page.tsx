import { requireFashionProduction } from "@/lib/fashion/access";
import { ProductionDetail } from "@/components/app/fashion/ProductionDetail";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { caps } = await requireFashionProduction();
  const { id } = await params;
  return <ProductionDetail id={id} canManage={caps.manage_production} canManageQc={caps.manage_qc} />;
}
