import { requireLogistics, companyCanCreateExports } from "@/lib/logistics/access";
import { ExportSetsList } from "@/components/app/logistics/ExportSetsList";

export default async function Page() {
  const { companyId, caps } = await requireLogistics();
  // §1: MK фирмите (SEM) виждат списъка read-only, но без „Нова експортна доставка".
  const canCreate = caps.manage_documents && (await companyCanCreateExports(companyId));
  return <ExportSetsList canManage={caps.manage_documents} canCreate={canCreate} />;
}
