import { requireFashionProduction } from "@/lib/fashion/access";
import { FashionSettingsForm } from "@/components/app/fashion/FashionSettingsForm";

export default async function Page() {
  const { caps } = await requireFashionProduction();
  return <FashionSettingsForm canManage={caps.manage_settings} />;
}
