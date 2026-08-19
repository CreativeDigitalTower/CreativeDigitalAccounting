import { requireCompany } from "@/lib/session";
import { FeatureRequestPage } from "@/components/app/FeatureRequestPage";

export default async function Page() {
  await requireCompany();
  return <FeatureRequestPage />;
}
