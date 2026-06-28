"use client";

import { useState, useMemo } from "react";
import Link from "next/link";

type Cat = { id: string; title: string; icon: string; description: string; count: number };
type Tpl = { id: string; title: string; categoryId: string; categoryTitle: string; complexity: string };
type Doc = { id: string; title: string; status: string; favorite: boolean; pinned: boolean; updatedAt: string; category: string };

const STATUS_LABEL: Record<string, string> = { draft: "Чернова", final: "Завършен", archived: "Архивиран" };
const STATUS_COLOR: Record<string, string> = { draft: "var(--brass)", final: "var(--emerald)", archived: "var(--muted)" };

export function BusinessDocsHome({ categories, templates, recent, favorites, recommended }: {
  categories: Cat[]; templates: Tpl[]; recent: Doc[]; favorites: Doc[]; recommended: Tpl[];
}) {
  const [q, setQ] = useState("");
  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (s.length < 2) return [];
    return templates.filter((t) => t.title.toLowerCase().includes(s) || t.categoryTitle.toLowerCase().includes(s)).slice(0, 24);
  }, [q, templates]);

  return (
    <>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 28, fontWeight: 700, margin: "0 0 4px" }}>Център за бизнес документи</h1>
        <div style={{ color: "var(--muted)", fontSize: 13.5 }}>{templates.length} професионални шаблона · {categories.length} категории — попълнени автоматично с данните на вашата фирма</div>
      </div>

      {/* Търсене */}
      <div style={{ position: "relative", marginBottom: 22 }}>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={'🔍 Търсете документ… (напр. договор, пълномощно, заповед)'}
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

      {/* Бързи действия */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 24 }}>
        <Link href="/dashboard/business-docs/category/contracts" className="btn btn-primary btn-sm">📝 Нов договор</Link>
        <Link href="/dashboard/business-docs/category/company" className="btn btn-ghost btn-sm">🏢 Заповед / Решение</Link>
        <Link href="/dashboard/business-docs/category/hr" className="btn btn-ghost btn-sm">👔 Документ за персонал</Link>
        <Link href="/dashboard/business-docs/all" className="btn btn-ghost btn-sm">📚 Всички документи</Link>
      </div>

      {/* Последни + любими */}
      {(recent.length > 0 || favorites.length > 0) && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 26 }}>
          <Panel title="🕒 Последно използвани" docs={recent} empty="Все още нямате генерирани документи." />
          <Panel title="⭐ Любими" docs={favorites} empty="Маркирайте документи като любими за бърз достъп." />
        </div>
      )}

      {/* Категории */}
      <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 18, fontWeight: 700, margin: "0 0 12px" }}>Категории</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 14, marginBottom: 28 }}>
        {categories.map((c) => (
          <Link key={c.id} href={`/dashboard/business-docs/category/${c.id}`} className="glass panel" style={{ padding: "18px 20px", textDecoration: "none", color: "inherit", transition: "transform .12s" }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>{c.icon}</div>
            <div style={{ fontFamily: "'Fraunces', serif", fontSize: 16, fontWeight: 700, marginBottom: 4 }}>{c.title}</div>
            <div style={{ fontSize: 12.5, color: "var(--ink-soft)", lineHeight: 1.5, marginBottom: 8 }}>{c.description}</div>
            <div style={{ fontSize: 11.5, color: "var(--brass)", fontWeight: 600 }}>{c.count} шаблона →</div>
          </Link>
        ))}

        {/* AI — coming soon */}
        <div className="glass panel" style={{ padding: "18px 20px", position: "relative", opacity: 0.85, border: "1px dashed var(--brass)" }}>
          <span style={{ position: "absolute", top: 12, right: 12, background: "var(--brass)", color: "#fff", fontSize: 9.5, fontWeight: 700, padding: "2px 8px", borderRadius: 20, letterSpacing: .5 }}>COMING SOON</span>
          <div style={{ fontSize: 28, marginBottom: 8 }}>✨</div>
          <div style={{ fontFamily: "'Fraunces', serif", fontSize: 16, fontWeight: 700, marginBottom: 4 }}>AI Бизнес документи</div>
          <div style={{ fontSize: 12.5, color: "var(--ink-soft)", lineHeight: 1.5 }}>Очаквайте скоро — генериране на документи чрез изкуствен интелект.</div>
        </div>
      </div>

      {/* Препоръчани */}
      {recommended.length > 0 && (
        <>
          <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 18, fontWeight: 700, margin: "0 0 12px" }}>Препоръчани шаблони</h2>
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
                <span style={{ fontSize: 10.5, fontWeight: 700, color: STATUS_COLOR[d.status], flexShrink: 0 }}>{STATUS_LABEL[d.status]}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    );
  }
}
