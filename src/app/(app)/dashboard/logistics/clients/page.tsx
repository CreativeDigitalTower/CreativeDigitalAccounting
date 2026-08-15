import { requireLogistics } from "@/lib/logistics/access";
import { LogisticsClients } from "@/components/app/logistics/LogisticsClients";

export default async function Page() {
  await requireLogistics();
  return <LogisticsClients />;
}
