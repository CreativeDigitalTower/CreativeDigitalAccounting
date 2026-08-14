import { requireLogistics } from "@/lib/logistics/access";
import { LogisticsProducts } from "@/components/app/logistics/LogisticsProducts";

export default async function Page() {
  const { caps } = await requireLogistics();
  return <LogisticsProducts canManage={caps.manage_rates} />;
}
