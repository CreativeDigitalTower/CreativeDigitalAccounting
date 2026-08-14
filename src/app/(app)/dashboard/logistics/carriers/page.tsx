import { requireLogistics } from "@/lib/logistics/access";
import { LogisticsCarriers } from "@/components/app/logistics/LogisticsCarriers";

export default async function Page() {
  const { caps } = await requireLogistics();
  return <LogisticsCarriers canManage={caps.manage_rates} />;
}
