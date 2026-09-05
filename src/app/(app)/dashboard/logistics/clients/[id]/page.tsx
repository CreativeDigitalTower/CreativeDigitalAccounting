import { requireLogistics } from "@/lib/logistics/access";
import { ClientDossier } from "@/components/app/logistics/ClientDossier";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { caps } = await requireLogistics();
  const { id } = await params;
  return <ClientDossier id={id} canManage={caps.manage_historical} canEdit={caps.manage_documents} />;
}
