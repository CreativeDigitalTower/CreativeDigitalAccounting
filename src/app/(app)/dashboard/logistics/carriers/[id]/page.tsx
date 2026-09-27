import { requireLogistics } from "@/lib/logistics/access";
import { CarrierDetail } from "@/components/app/logistics/CarrierDetail";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { caps } = await requireLogistics();
  const { id } = await params;
  return <CarrierDetail id={id} canManage={caps.manage_rates} />;
}
