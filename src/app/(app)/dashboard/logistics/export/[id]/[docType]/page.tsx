import { requireLogistics } from "@/lib/logistics/access";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { ExportDocEditor } from "@/components/app/logistics/ExportDocEditor";

export default async function Page({ params }: { params: Promise<{ id: string; docType: string }> }) {
  const { caps, companyId } = await requireLogistics();
  const { id, docType } = await params;
  const doc = await prisma.exportDocument.findFirst({
    where: { docType, set: { id, companyId } },
    select: { id: true },
  });
  if (!doc) notFound();
  return <ExportDocEditor setId={id} docId={doc.id} canManage={caps.manage_documents} />;
}
