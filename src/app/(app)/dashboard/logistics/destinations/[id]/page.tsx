import { requireLogistics } from "@/lib/logistics/access";
import { DestinationDetail } from "@/components/app/logistics/DestinationDetail";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { caps } = await requireLogistics();
  const { id } = await params;
  return <DestinationDetail id={id} canManage={caps.manage_rates} />;
}
