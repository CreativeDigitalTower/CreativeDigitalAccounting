import { requireLogistics } from "@/lib/logistics/access";
import { LogisticsVehicles } from "@/components/app/logistics/LogisticsVehicles";

export default async function Page() {
  const { caps } = await requireLogistics();
  return <LogisticsVehicles canManage={caps.manage_shipments} />;
}
