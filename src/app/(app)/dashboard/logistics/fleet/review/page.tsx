import { requireLogistics } from "@/lib/logistics/access";
import { FleetReviewClient } from "@/components/app/logistics/FleetReviewClient";

export default async function Page() {
  const { caps } = await requireLogistics();
  return <FleetReviewClient canManage={caps.manage_shipments} />;
}
