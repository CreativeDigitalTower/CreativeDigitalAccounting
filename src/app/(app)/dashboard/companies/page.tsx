import { requireCompany } from "@/lib/session";
import { getMyCompanies, countPaidOwnedCompanies } from "@/lib/myCompanies";
import { MyCompaniesClient } from "@/components/app/MyCompaniesClient";

// „Моите фирми" — управление на няколко собствени фирми от един профил.
// НЕ е за счетоводни къщи (тези фирми са isAccountingFirm=false, managedByFirmId=null).
export default async function MyCompaniesPage() {
  const { userId, companyId } = await requireCompany();
  const [companies, paidCount] = await Promise.all([getMyCompanies(userId), countPaidOwnedCompanies(userId)]);
  return <MyCompaniesClient companies={companies} activeId={companyId} paidCount={paidCount} />;
}
