import { requireFashionProduction } from "@/lib/fashion/access";
import { StylesClient } from "@/components/app/fashion/StylesClient";

export default async function Page() {
  const { caps } = await requireFashionProduction();
  return <StylesClient canManage={caps.manage_styles} />;
}
