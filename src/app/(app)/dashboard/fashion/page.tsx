import { requireFashionProduction } from "@/lib/fashion/access";
import { FashionHub } from "@/components/app/fashion/FashionHub";

export default async function Page() {
  const { caps } = await requireFashionProduction();
  return <FashionHub caps={caps} />;
}
