import { requireLogistics } from "@/lib/logistics/access";
import { LogisticsReportsClient } from "@/components/app/logistics/LogisticsReportsClient";

export default async function Page() {
  await requireLogistics();
  return <LogisticsReportsClient />;
}
