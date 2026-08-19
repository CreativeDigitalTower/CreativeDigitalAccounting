import { requireSuperAdmin } from "@/lib/session";
import { AdminFeatureRequests } from "@/components/app/AdminFeatureRequests";

export default async function Page() {
  await requireSuperAdmin();
  return <AdminFeatureRequests />;
}
