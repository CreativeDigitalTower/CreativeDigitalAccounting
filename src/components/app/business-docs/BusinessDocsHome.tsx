"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { UiIcon, docCategoryIcon } from "@/components/app/NavIcons";
import { useT } from "@/components/i18n/I18nProvider";

type Cat = { id: string; title: string; icon: string; description: string; count: number };
type Tpl = { id: string; title: string; categoryId: string; categoryTitle: string; complexity: string };
type Doc = { id: string; title: string; status: string; favorite: boolean; pinned: boolean; updatedAt: string; category: string };

const STATUS_COLOR: Record<string, string> = { draft: "var(--brass)", final: "var(--emerald)", archived: "var(--muted)" };

export function BusinessDocsHome({ categories, templates, recent, favorites, recommended }: {
  categories: Cat[]; templates: Tpl[]; recent: Doc[]; favorites: Doc[]; recommended: Tpl[];
}) {
  const t = useT();
  const catTitle = (id: string, fb: string) => { const v = t(`bizdocs.cat.${id}.title`); return v.startsWith("bizdocs.") ? fb : v; };
  const catDesc = (id: string, fb: string) => { const v = t(`bizdocs.cat.${id}.desc`); return v.startsWith("bizdocs.") ? fb : v; };
  const [q, setQ] = useState("");
  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (s.length < 2) return [];
    return templates.filter((t) => t.title.toLowerCase().includes(s) || t.categoryTitle.toLowerCase().includes(s)).slice(0, 24);
  }, [q, templates]);

  return (
    <>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 28, fontWeight: 700, margin: "0 0 4px" }}>{t("bizdocs.ui.home.title")}</h1>
        <div style={{ color: "var(--muted)", fontSize: 13.5 }}>{t("bizdocs.ui.home.subtitle", { n: templates.length, m: categories.length })}</div>
      </div>

      {/* Търсене */}
      <div style={{ position: "relative", marginBottom: 22 }}>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("bizdocs.ui.home.searchPh")}
          style={{ fontSize: 15, padding: "13px 16px" }} />
        {results.length > 0 && (
          <div className="glass" style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 30, marginTop: 6, borderRadius: 10, maxHeight: 360, overflowY: "auto", boxShadow: "0 12px 32px rgba(0,0,0,.14)" }}>
            {results.map((t) => (
              <Link key={t.id} href={`/dashboard/business-docs/template/${t.id}`} style={{ display: "flex", justifyContent: "space-between", padding: "10px 14px", borderBottom: "1px solid rgba(217,215,200,.5)", textDecoration: "none", color: "inherit" }}>
                <span style={{ fontWeight: 600, fontSize: 13.5 }}>{t.title}</span>
                <span style={{ fontSize: 12, color: "var(--muted)" }}>{t.categoryTitle}</span>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Открояваща се връзка към създадените документи — за да е ясно къде са генерираните договори */}
      <Link href="/dashboard/business-docs/all" className="glass panel" style={{
        display: "flex", alignItems: "center", gap: 14, marginBottom: 16, padding: "16px 20px", textDecoration: "none", color: "inherit",
        borderLeft: "4px solid var(--emerald)", background: "linear-gradient(120deg, rgba(15,138,106,.10), rgba(15,138,106,.02))",
      }}>
        <span className="icon-tile" style={{ width: 42, height: 42, borderRadius: 12, flexShrink: 0 }}>{docCategoryIcon("policies", 22)}</span>
        <span style={{ flex: 1 }}>
          <span style={{ display: "block", fontFamily: "'Fraunces', serif", fontSize: 16, fontWeight: 700 }}>{t("bizdocs.ui.home.myDocs")}</span>
          <span style={{ display: "block", fontSize: 12.5, color: "var(--ink-soft)" }}>{t("bizdocs.ui.home.myDocsSub")}</span>
        </span>
        <span className="btn btn-primary btn-sm">{t("bizdocs.ui.home.open")}</span>
      </Link>

      {/* Бързи действия */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
        <Link href="/dashboard/business-docs/category/contracts" className="btn btn-primary btn-sm">{t("bizdocs.ui.home.newContract")}</Link>
        <Link href="/dashboard/business-docs/category/company" className="btn btn-ghost btn-sm">{t("bizdocs.ui.home.orderDecision")}</Link>
        <Link href="/dashboard/business-docs/category/hr" className="btn btn-ghost btn-sm">{t("bizdocs.ui.home.hrDoc")}</Link>
      </div>

      {/* Дисклеймър */}
      <div className="glass panel" style={{ padding: "12px 16px", marginBottom: 24, fontSize: 12.5, color: "var(--ink-soft)", borderLeft: "4px solid var(--brass)" }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: "-2px", marginRight: 4 }}><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 7.5h.01" /></svg>
        <span dangerouslySetInnerHTML={{ __html: t("bizdocs.ui.home.disclaimer") }} />
      </div>

      {/* Последни + любими */}
      {(recent.length > 0 || favorites.length > 0) && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 26 }}>
          <Panel title={t("bizdocs.ui.home.recent")} docs={recent} empty={t("bizdocs.ui.home.recentEmpty")} />
          <Panel title={t("bizdocs.ui.home.favorites")} docs={favorites} empty={t("bizdocs.ui.home.favEmpty")} />
        </div>
      )}

      {/* Категории */}
      <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 18, fontWeight: 700, margin: "0 0 12px" }}>{t("bizdocs.ui.home.categories")}</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 14, marginBottom: 28 }}>
        {categories.map((c) => (
          <Link key={c.id} href={`/dashboard/business-docs/category/${c.id}`} className="glass panel" style={{ padding: "18px 20px", textDecoration: "none", color: "inherit", transition: "transform .12s" }}>
            <div style={{ marginBottom: 8, color: "var(--emerald-dark)" }}>{docCategoryIcon(c.id, 26)}</div>
            <div style={{ fontFamily: "'Fraunces', serif", fontSize: 16, fontWeight: 700, marginBottom: 4 }}>{catTitle(c.id, c.title)}</div>
            <div style={{ fontSize: 12.5, color: "var(--ink-soft)", lineHeight: 1.5, marginBottom: 8 }}>{catDesc(c.id, c.description)}</div>
            <div style={{ fontSize: 11.5, color: "var(--brass)", fontWeight: 600 }}>{t("bizdocs.ui.home.tplCount", { n: c.count })}</div>
          </Link>
        ))}

        {/* AI — coming soon */}
        <div className="glass panel" style={{ padding: "18px 20px", position: "relative", opacity: 0.85, border: "1px dashed var(--brass)" }}>
          <span style={{ position: "absolute", top: 12, right: 12, background: "var(--brass)", color: "#fff", fontSize: 9.5, fontWeight: 700, padding: "2px 8px", borderRadius: 20, letterSpacing: .5 }}>COMING SOON</span>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 8, color: "var(--brass)" }}><UiIcon.star width={26} height={26} /></div>
          <div style={{ fontFamily: "'Fraunces', serif", fontSize: 16, fontWeight: 700, marginBottom: 4 }}>{t("bizdocs.ui.home.aiTitle")}</div>
          <div style={{ fontSize: 12.5, color: "var(--ink-soft)", lineHeight: 1.5 }}>{t("bizdocs.ui.home.aiSub")}</div>
        </div>
      </div>

      {/* Препоръчани */}
      {recommended.length > 0 && (
        <>
          <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 18, fontWeight: 700, margin: "0 0 12px" }}>{t("bizdocs.ui.home.recommended")}</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
            {recommended.map((t) => (
              <Link key={t.id} href={`/dashboard/business-docs/template/${t.id}`} className="glass panel" style={{ padding: "14px 16px", textDecoration: "none", color: "inherit" }}>
                <div style={{ fontWeight: 600, fontSize: 13.5, marginBottom: 3 }}>{t.title}</div>
                <div style={{ fontSize: 11.5, color: "var(--muted)" }}>{t.categoryTitle}</div>
              </Link>
            ))}
          </div>
        </>
      )}
    </>
  );

  function Panel({ title, docs, empty }: { title: string; docs: Doc[]; empty: string }) {
    return (
      <div className="glass panel">
        <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 15, margin: "0 0 10px" }}>{title}</h3>
        {docs.length === 0 ? (
          <div style={{ fontSize: 12.5, color: "var(--muted)" }}>{empty}</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {docs.map((d) => (
              <Link key={d.id} href={`/dashboard/business-docs/doc/${d.id}`} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, padding: "7px 0", borderBottom: "1px solid rgba(217,215,200,.4)", textDecoration: "none", color: "inherit", fontSize: 13 }}>
                <span style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.title}</span>
                <span style={{ fontSize: 10.5, fontWeight: 700, color: STATUS_COLOR[d.status], flexShrink: 0 }}>{t(`bizdocs.ui.status.${d.status}`)}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    );
  }
}
