import { requireCompany, getPlan } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { planHasFeature } from "@/lib/constants";
import Link from "next/link";
import { getCategory } from "@/lib/businessDocs/templates";
import { LockedScreen } from "@/components/app/business-docs/LockedScreen";
import { MyDocsList } from "@/components/app/business-docs/MyDocsList";

export default async function AllBusinessDocsPage() {
  const { companyId } = await requireCompany();
  const plan = await getPlan(companyId);
  if (!planHasFeature(plan, "doc_templates")) return <LockedScreen />;

  const docs = await prisma.businessDocument.findMany({
    where: { companyId },
    select: { id: true, title: true, category: true, status: true, createdAt: true, updatedAt: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18 }}>
        <Link href="/dashboard/business-docs" style={{ color: "var(--muted)", textDecoration: "none", fontSize: 13 }}>← Бизнес документи</Link>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 24, fontWeight: 700, margin: 0 }}>Моите документи</h1>
      </div>

      {docs.length === 0 ? (
        <div className="glass panel" style={{ textAlign: "center", padding: "48px 0", color: "var(--muted)" }}>
          <div style={{ fontSize: 14, marginBottom: 16 }}>Все още нямате генерирани документи</div>
          <Link href="/dashboard/business-docs" className="btn btn-primary btn-sm">Разгледай шаблоните</Link>
        </div>
      ) : (
        <MyDocsList docs={docs.map((d) => ({
          id: d.id, title: d.title, category: d.category, categoryLabel: getCategory(d.category)?.title ?? d.category,
          status: d.status, createdAt: d.createdAt.toISOString(), updatedAt: d.updatedAt.toISOString(),
        }))} />
      )}
    </>
  );
}
