import { requireFashionProduction } from "@/lib/fashion/access";
import { OperationsOverview } from "@/components/app/fashion/OperationsOverview";

export default async function Page() {
  const { caps } = await requireFashionProduction();
  return <OperationsOverview canManageMachines={caps.manage_settings} />;
}
