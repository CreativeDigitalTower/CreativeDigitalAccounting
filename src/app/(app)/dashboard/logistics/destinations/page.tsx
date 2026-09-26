import { requireLogistics } from "@/lib/logistics/access";
import { DestinationsList } from "@/components/app/logistics/DestinationsList";

export default async function Page() {
  const { caps } = await requireLogistics();
  return <DestinationsList canManage={caps.manage_rates} />;
}
