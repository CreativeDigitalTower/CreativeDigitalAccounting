import { requireLogistics, groupCounterparties } from "@/lib/logistics/access";
import { BgMkInvoices } from "@/components/app/logistics/BgMkInvoices";

export default async function Page() {
  const { companyId, caps } = await requireLogistics();
  const counterparties = await groupCounterparties(companyId);
  return <BgMkInvoices canManage={caps.manage_invoices} counterparties={counterparties} />;
}
