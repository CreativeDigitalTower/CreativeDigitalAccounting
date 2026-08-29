import { requireLogistics } from "@/lib/logistics/access";
import { ReceivedDeliveries } from "@/components/app/logistics/ReceivedDeliveries";

export default async function Page() {
  const { caps } = await requireLogistics();
  // Издаването на MK фактура минава през стандартния Invoice engine — правото е
  // manage_documents (същото като за фактури), а не отделно логистично право.
  return <ReceivedDeliveries canManage={caps.manage_documents} />;
}
