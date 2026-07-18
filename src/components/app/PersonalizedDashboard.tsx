"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DASHBOARD_CARDS } from "@/lib/workspaces";
import { useT } from "@/components/i18n/I18nProvider";

export function PersonalizedDashboard({ initialOrder, initialHidden, sectorId }: {
  initialOrder: string[]; initialHidden: string[]; sectorId: string | null;
}) {
  const t = useT();
  const router = useRouter();
  const [order, setOrder] = useState<string[]>(initialOrder);
  const [hidden, setHidden] = useState<string[]>(initialHidden.filter((k) => DASHBOARD_CARDS[k]));
  const [edit, setEdit] = useState(false);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  function onDrop(target: number) {
    if (dragIdx === null || dragIdx === target) return;
    setOrder((prev) => {
      const next = [...prev];
      const [m] = next.splice(dragIdx, 1);
      next.splice(target, 0, m);
      return next;
    });
    setDragIdx(null);
  }
  function hideCard(k: string) { setOrder((o) => o.filter((x) => x !== k)); setHidden((h) => [...h, k]); }
  function showCard(k: string) { setHidden((h) => h.filter((x) => x !== k)); setOrder((o) => [...o, k]); }

  async function save() {
    setSaving(true);
    await fetch("/api/business-profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ order, hidden }) });
    setSaving(false); setEdit(false); router.refresh();
  }
  async function reset() {
    setSaving(true);
    await fetch("/api/business-profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reset: true }) });
    setSaving(false); setEdit(false); router.refresh();
  }

  const cards = order.filter((k) => DASHBOARD_CARDS[k]);

  return (
    <div style={{ marginTop: 28 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
        <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 16, fontWeight: 700, margin: 0 }}>
          {t("sectors.pd.quickActions")}{sectorId && <span style={{ fontSize: 12, color: "var(--muted)", fontWeight: 400 }}> · {t(`sectors.sector.${sectorId}`)}</span>}
        </h3>
        <div style={{ display: "flex", gap: 8 }}>
          {edit ? (
            <>
              <button className="btn btn-ghost btn-sm" onClick={reset} disabled={saving}>{t("sectors.pd.restore")}</button>
              <button className="btn btn-primary btn-sm" onClick={save} disabled={saving}>{saving ? "…" : t("sectors.pd.save")}</button>
            </>
          ) : (
            <button className="btn btn-ghost btn-sm" onClick={() => setEdit(true)}>{t("sectors.pd.customize")}</button>
          )}
        </div>
      </div>

      {edit && <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 10 }}>{t("sectors.pd.dragHint")}</div>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: 12 }}>
        {cards.map((k, i) => {
          const c = DASHBOARD_CARDS[k];
          const inner = (
            <>
              <div className="icon-tile" style={{ marginBottom: 8 }}><c.Icon /></div>
              <div style={{ fontSize: 13.5, fontWeight: 600 }}>{t(`sectors.card.${k}`)}</div>
            </>
          );
          if (edit) {
            return (
              <div key={k} draggable onDragStart={() => setDragIdx(i)} onDragOver={(e) => e.preventDefault()} onDrop={() => onDrop(i)}
                className="glass panel" style={{ padding: "16px 18px", position: "relative", cursor: "grab", border: dragIdx === i ? "2px dashed var(--emerald)" : undefined }}>
                <button onClick={() => hideCard(k)} title={t("sectors.pd.hide")} style={{ position: "absolute", top: 6, right: 6, background: "none", border: "none", color: "var(--brick)", cursor: "pointer", fontSize: 14 }}>✕</button>
                {inner}
              </div>
            );
          }
          return (
            <Link key={k} href={c.href} className="glass panel hover-lift" style={{ padding: "16px 18px", textDecoration: "none", color: "inherit" }}>
              {inner}
            </Link>
          );
        })}
      </div>

      {edit && hidden.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)", marginBottom: 6 }}>{t("sectors.pd.hiddenCards")}</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {hidden.map((k) => DASHBOARD_CARDS[k] && (
              <button key={k} onClick={() => showCard(k)} style={{ cursor: "pointer", padding: "6px 12px", borderRadius: 16, border: "1px dashed var(--border)", background: "rgba(255,255,255,.5)", fontSize: 12.5 }}>
                + {t(`sectors.card.${k}`)}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
