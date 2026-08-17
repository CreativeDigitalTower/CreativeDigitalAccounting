import { requireFashionProduction } from "@/lib/fashion/access";
import { BomOverview } from "@/components/app/fashion/BomOverview";

export default async function Page() {
  await requireFashionProduction();
  return <BomOverview />;
}
