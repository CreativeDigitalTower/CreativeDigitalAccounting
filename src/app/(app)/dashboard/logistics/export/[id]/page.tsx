import { requireLogistics } from "@/lib/logistics/access";
import { ExportSetDetail } from "@/components/app/logistics/ExportSetDetail";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { caps } = await requireLogistics();
  const { id } = await params;
  return <ExportSetDetail id={id} canManage={caps.manage_documents} />;
}
