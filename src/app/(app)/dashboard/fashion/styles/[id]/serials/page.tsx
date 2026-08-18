import { requireFashionProduction } from "@/lib/fashion/access";
import { SerialsEditor } from "@/components/app/fashion/SerialsEditor";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { caps } = await requireFashionProduction();
  const { id } = await params;
  return <SerialsEditor styleId={id} canManageStyles={caps.manage_styles} canManageProd={caps.manage_production} />;
}
