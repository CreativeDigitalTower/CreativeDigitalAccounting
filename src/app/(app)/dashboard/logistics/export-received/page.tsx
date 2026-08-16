import { requireLogistics } from "@/lib/logistics/access";
import { ExportReceivedList } from "@/components/app/logistics/ExportReceivedList";

export default async function Page() {
  await requireLogistics();
  return <ExportReceivedList />;
}
