import { requireFashionProduction } from "@/lib/fashion/access";
import { MaterialDetail } from "@/components/app/fashion/MaterialDetail";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { caps } = await requireFashionProduction();
  const { id } = await params;
  return <MaterialDetail id={id} canManage={caps.manage_materials} />;
}
