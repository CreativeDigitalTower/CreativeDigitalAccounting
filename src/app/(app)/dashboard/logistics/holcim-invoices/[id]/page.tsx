import { requireLogistics } from "@/lib/logistics/access";
import { HolcimInvoiceDetail } from "@/components/app/logistics/HolcimInvoiceDetail";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  await requireLogistics();
  const { id } = await params;
  return <HolcimInvoiceDetail id={id} />;
}
