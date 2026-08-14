import { requireLogistics } from "@/lib/logistics/access";
import { ShipmentsList } from "@/components/app/logistics/ShipmentsList";

export default async function Page() {
  const { caps } = await requireLogistics();
  return <ShipmentsList canManage={caps.manage_shipments} />;
}
