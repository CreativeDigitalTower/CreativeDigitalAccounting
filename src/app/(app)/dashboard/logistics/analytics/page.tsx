import { requireLogistics } from "@/lib/logistics/access";
import { LogisticsAnalytics } from "@/components/app/logistics/LogisticsAnalytics";

export default async function Page() {
  await requireLogistics();
  return <LogisticsAnalytics />;
}
