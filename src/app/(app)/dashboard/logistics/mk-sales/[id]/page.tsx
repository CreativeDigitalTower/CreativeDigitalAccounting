import { requireLogistics } from "@/lib/logistics/access";
import { MkSaleDetail } from "@/components/app/logistics/MkSaleDetail";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  await requireLogistics();
  const { id } = await params;
  return <MkSaleDetail id={id} />;
}
