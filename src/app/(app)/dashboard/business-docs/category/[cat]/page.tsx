import { requireCompany, getPlan } from "@/lib/session";
import { planHasFeature } from "@/lib/constants";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getCategory, TEMPLATES } from "@/lib/businessDocs/templates";
import { LockedScreen } from "@/components/app/business-docs/LockedScreen";
import { docCategoryIcon } from "@/components/app/NavIcons";
import { getT } from "@/lib/i18n/server";

const COMPLEXITY_COLOR: Record<string, string> = { easy: "var(--emerald)", medium: "var(--brass)", detailed: "var(--brick)" };

export default async function CategoryPage({ params }: { params: Promise<{ cat: string }> }) {
  const { companyId } = await requireCompany();
  const { t } = await getT();
  const catL = (id: string, fb: string) => { const v = t(`bizdocs.cat.${id}.title`); return v.startsWith("bizdocs.") ? fb : v; };
  const catD = (id: string, fb: string) => { const v = t(`bizdocs.cat.${id}.desc`); return v.startsWith("bizdocs.") ? fb : v; };
  const plan = await getPlan(companyId);
  if (!planHasFeature(plan, "doc_templates")) return <LockedScreen />;

  const { cat } = await params;
  const category = getCategory(cat);
  if (!category) notFound();
  const templates = TEMPLATES.filter((t) => t.categoryId === cat);

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18 }}>
        <Link href="/dashboard/business-docs" style={{ color: "var(--muted)", textDecoration: "none", fontSize: 13 }}>{t("bizdocs.ui.category.back")}</Link>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 24, fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: 10 }}>{docCategoryIcon(category.id, 22)} {catL(category.id, category.title)}</h1>
      </div>
      <p style={{ color: "var(--ink-soft)", fontSize: 13.5, marginBottom: 20 }}>{catD(category.id, category.description)}</p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 14 }}>
        {templates.map((tpl) => {
          const cx = { label: t(`bizdocs.ui.complexity.${tpl.complexity}`), color: COMPLEXITY_COLOR[tpl.complexity] };
          return (
            <Link key={tpl.id} href={`/dashboard/business-docs/template/${tpl.id}`} className="glass panel" style={{ padding: "18px 20px", textDecoration: "none", color: "inherit", display: "flex", flexDirection: "column" }}>
              <div style={{ fontFamily: "'Fraunces', serif", fontSize: 15.5, fontWeight: 700, marginBottom: 6 }}>{tpl.title}</div>
              <div style={{ fontSize: 12.5, color: "var(--ink-soft)", lineHeight: 1.5, flex: 1, marginBottom: 12 }}>{tpl.description}</div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: cx.color, background: "rgba(0,0,0,.04)", borderRadius: 12, padding: "2px 9px" }}>{cx.label}</span>
                <span style={{ fontSize: 12, color: "var(--brass)", fontWeight: 600 }}>{t("bizdocs.ui.category.preview")}</span>
              </div>
            </Link>
          );
        })}
      </div>
    </>
  );
}
