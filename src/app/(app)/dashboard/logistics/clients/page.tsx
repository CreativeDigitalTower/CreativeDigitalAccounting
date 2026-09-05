import { requireLogistics } from "@/lib/logistics/access";
import { LogisticsClients } from "@/components/app/logistics/LogisticsClients";

export default async function Page() {
  const { caps } = await requireLogistics();
  return <LogisticsClients canManage={caps.manage_documents} />;
}
