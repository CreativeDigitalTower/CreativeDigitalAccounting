import { requireFashionProduction } from "@/lib/fashion/access";
import { StyleDetail } from "@/components/app/fashion/StyleDetail";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { caps } = await requireFashionProduction();
  const { id } = await params;
  return <StyleDetail id={id} canManageStyles={caps.manage_styles} canManagePatterns={caps.manage_patterns} />;
}
