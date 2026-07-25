import { requireCompany, getPlan } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { planHasFeature } from "@/lib/constants";
import { RECOMMENDED_IDS, getTemplate, visibleCategories, visibleTemplates, canAccessTemplate } from "@/lib/businessDocs/templates";
import { BusinessDocsHome } from "@/components/app/business-docs/BusinessDocsHome";
import { LockedScreen } from "@/components/app/business-docs/LockedScreen";

export default async function BusinessDocsPage() {
  const { companyId } = await requireCompany();
  const plan = await getPlan(companyId);
  if (!planHasFeature(plan, "doc_templates")) return <LockedScreen />;
  const company = await prisma.company.findUnique({ where: { id: companyId }, select: { eik: true } });
  const eik = company?.eik ?? null;

  const docs = await prisma.businessDocument.findMany({
    where: { companyId },
    select: { id: true, title: true, status: true, favorite: true, pinned: true, updatedAt: true, category: true },
    orderBy: { updatedAt: "desc" },
    take: 50,
  });
  const recent = docs.slice(0, 6).map((d) => ({ ...d, updatedAt: d.updatedAt.toISOString() }));
  const favorites = docs.filter((d) => d.favorite).slice(0, 6).map((d) => ({ ...d, updatedAt: d.updatedAt.toISOString() }));

  const categories = visibleCategories(eik).map((c) => ({ id: c.id, title: c.title, icon: c.icon, description: c.description, count: c.templates.length }));
  const templates = visibleTemplates(eik).map((t) => ({ id: t.id, title: t.title, categoryId: t.categoryId, categoryTitle: t.categoryTitle, complexity: t.complexity }));
  const recommended = RECOMMENDED_IDS.map(getTemplate).filter((t): t is NonNullable<typeof t> => !!t && canAccessTemplate(t.id, eik)).map((t) => ({ id: t.id, title: t.title, categoryId: t.categoryId, categoryTitle: t.categoryTitle, complexity: t.complexity }));

  return <BusinessDocsHome categories={categories} templates={templates} recent={recent} favorites={favorites} recommended={recommended} />;
}
