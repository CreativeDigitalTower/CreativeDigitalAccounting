import { requireFashionProduction } from "@/lib/fashion/access";
import { FinishedGoodsClient } from "@/components/app/fashion/FinishedGoodsClient";

export default async function Page() {
  const { caps } = await requireFashionProduction();
  return <FinishedGoodsClient canManage={caps.manage_finished_goods} />;
}
