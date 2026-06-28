import { requireCompany, getPlan } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { planHasFeature } from "@/lib/constants";
import { notFound } from "next/navigation";
import { DocEditor } from "@/components/app/business-docs/DocEditor";
import { LockedScreen } from "@/components/app/business-docs/LockedScreen";

export default async function BusinessDocEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { companyId } = await requireCompany();
  const plan = await getPlan(companyId);
  if (!planHasFeature(plan, "doc_templates")) return <LockedScreen />;

  const { id } = await params;
  const [doc, company] = await Promise.all([
    prisma.businessDocument.findUnique({ where: { id } }),
    prisma.company.findUnique({ where: { id: companyId }, include: { subscription: true } }),
  ]);
  if (!doc || doc.companyId !== companyId) notFound();

  const showLogo = plan !== "free" && !!company?.logoUrl;

  return (
    <DocEditor
      doc={{ id: doc.id, title: doc.title, contentHtml: doc.contentHtml, status: doc.status, favorite: doc.favorite, pinned: doc.pinned }}
      logoUrl={showLogo ? company!.logoUrl : null}
      companyName={company?.name ?? ""}
    />
  );
}
