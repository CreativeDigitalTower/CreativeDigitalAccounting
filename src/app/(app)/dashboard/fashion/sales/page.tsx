import { requireFashionProduction } from "@/lib/fashion/access";
import { SalesClient } from "@/components/app/fashion/SalesClient";

export default async function Page() {
  const { caps } = await requireFashionProduction();
  return <SalesClient canManage={caps.manage_sales_reports} />;
}
