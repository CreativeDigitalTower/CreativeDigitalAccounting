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
  const [doc, company, invoices] = await Promise.all([
    prisma.businessDocument.findUnique({ where: { id } }),
    prisma.company.findUnique({ where: { id: companyId }, include: { subscription: true } }),
    prisma.document.findMany({ where: { companyId, type: { in: ["invoice", "proforma"] } }, select: { id: true, number: true, type: true }, orderBy: { issueDate: "desc" }, take: 100 }),
  ]);
  if (!doc || doc.companyId !== companyId) notFound();

  // Протоколите за приемо-предаване носят собствен подпис/печат в тялото —
  // затова НЕ добавяме автоматичното фирмено лого най-горе за тях.
  const showLogo = plan !== "free" && !!company?.logoUrl && !doc.templateId.startsWith("acceptance");

  return (
    <DocEditor
      doc={{ id: doc.id, title: doc.title, contentHtml: doc.contentHtml, status: doc.status, favorite: doc.favorite, pinned: doc.pinned }}
      logoUrl={showLogo ? company!.logoUrl : null}
      companyName={company?.name ?? ""}
      invoices={invoices}
    />
  );
}
