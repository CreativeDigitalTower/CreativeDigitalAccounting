import { requireFashionProduction } from "@/lib/fashion/access";
import { CuttingDetail } from "@/components/app/fashion/CuttingDetail";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { caps } = await requireFashionProduction();
  const { id } = await params;
  return <CuttingDetail id={id} canManage={caps.manage_cutting} />;
}
