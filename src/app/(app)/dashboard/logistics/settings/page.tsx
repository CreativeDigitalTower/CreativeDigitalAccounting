import { requireLogistics } from "@/lib/logistics/access";
import { LogisticsSettings } from "@/components/app/logistics/LogisticsSettings";

export default async function Page() {
  const { caps } = await requireLogistics();
  return <LogisticsSettings canManage={caps.manage_rates} />;
}
