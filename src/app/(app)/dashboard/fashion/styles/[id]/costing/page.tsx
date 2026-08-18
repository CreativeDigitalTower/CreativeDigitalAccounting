import { redirect } from "next/navigation";
import { requireFashionProduction } from "@/lib/fashion/access";
import { StyleCostingEditor } from "@/components/app/fashion/StyleCostingEditor";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { caps } = await requireFashionProduction();
  if (!caps.view_costing) redirect("/dashboard/fashion");
  const { id } = await params;
  return <StyleCostingEditor styleId={id} canManage={caps.manage_costing} />;
}
