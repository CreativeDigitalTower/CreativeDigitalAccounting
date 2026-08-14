import { requireLogistics } from "@/lib/logistics/access";
import { LogisticsRoutes } from "@/components/app/logistics/LogisticsRoutes";

export default async function Page() {
  const { caps } = await requireLogistics();
  return <LogisticsRoutes canManage={caps.manage_rates} />;
}
