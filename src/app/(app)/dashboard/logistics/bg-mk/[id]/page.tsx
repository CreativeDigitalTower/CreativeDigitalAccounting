import { requireLogistics } from "@/lib/logistics/access";
import { BgMkInvoiceDetail } from "@/components/app/logistics/BgMkInvoiceDetail";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  await requireLogistics();
  const { id } = await params;
  return <BgMkInvoiceDetail id={id} />;
}
