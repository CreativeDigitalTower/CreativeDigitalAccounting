import { requireFashionProduction } from "@/lib/fashion/access";
import { PatternsOverview } from "@/components/app/fashion/PatternsOverview";

export default async function Page() {
  await requireFashionProduction();
  return <PatternsOverview />;
}
