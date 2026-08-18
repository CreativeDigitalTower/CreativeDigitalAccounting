import { redirect } from "next/navigation";
import { requireFashionProduction } from "@/lib/fashion/access";
import { CostingOverview } from "@/components/app/fashion/CostingOverview";

export default async function Page() {
  const { caps } = await requireFashionProduction();
  if (!caps.view_costing) redirect("/dashboard/fashion");
  return <CostingOverview />;
}
