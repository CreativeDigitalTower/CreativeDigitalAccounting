import { requireCompany, getPlan } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { planHasFeature } from "@/lib/constants";
import { CATEGORIES, TEMPLATES, RECOMMENDED_IDS, getTemplate } from "@/lib/businessDocs/templates";
import { BusinessDocsHome } from "@/components/app/business-docs/BusinessDocsHome";
import { LockedScreen } from "@/components/app/business-docs/LockedScreen";

export default async function BusinessDocsPage() {
  const { companyId } = await requireCompany();
  const plan = await getPlan(companyId);
  if (!planHasFeature(plan, "doc_templates")) return <LockedScreen />;

  const docs = await prisma.businessDocument.findMany({
    where: { companyId },
    select: { id: true, title: true, status: true, favorite: true, pinned: true, updatedAt: true, category: true },
    orderBy: { updatedAt: "desc" },
    take: 50,
  });
  const recent = docs.slice(0, 6).map((d) => ({ ...d, updatedAt: d.updatedAt.toISOString() }));
  const favorites = docs.filter((d) => d.favorite).slice(0, 6).map((d) => ({ ...d, updatedAt: d.updatedAt.toISOString() }));

  const categories = CATEGORIES.map((c) => ({ id: c.id, title: c.title, icon: c.icon, description: c.description, count: c.templates.length }));
  const templates = TEMPLATES.map((t) => ({ id: t.id, title: t.title, categoryId: t.categoryId, categoryTitle: t.categoryTitle, complexity: t.complexity }));
  const recommended = RECOMMENDED_IDS.map(getTemplate).filter(Boolean).map((t) => ({ id: t!.id, title: t!.title, categoryId: t!.categoryId, categoryTitle: t!.categoryTitle, complexity: t!.complexity }));

  return <BusinessDocsHome categories={categories} templates={templates} recent={recent} favorites={favorites} recommended={recommended} />;
}
