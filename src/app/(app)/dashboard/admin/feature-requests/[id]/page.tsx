import { requireSuperAdmin } from "@/lib/session";
import { AdminFeatureRequestDetail } from "@/components/app/AdminFeatureRequestDetail";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  await requireSuperAdmin();
  const { id } = await params;
  return <AdminFeatureRequestDetail id={id} />;
}
