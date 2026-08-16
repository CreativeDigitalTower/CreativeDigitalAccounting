import { requireLogistics } from "@/lib/logistics/access";
import { ExportSetsList } from "@/components/app/logistics/ExportSetsList";

export default async function Page() {
  const { caps } = await requireLogistics();
  return <ExportSetsList canManage={caps.manage_documents} />;
}
