import { requireLogistics } from "@/lib/logistics/access";
import { LogisticsHolcimInvoices } from "@/components/app/logistics/LogisticsHolcimInvoices";

export default async function Page() {
  const { caps } = await requireLogistics();
  return <LogisticsHolcimInvoices canManage={caps.manage_invoices} />;
}
