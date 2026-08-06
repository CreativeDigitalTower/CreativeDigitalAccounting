"use client";

import { useState } from "react";
import { useI18n } from "@/components/i18n/I18nProvider";
import { formatCurrency } from "@/lib/constants";

export type ProdConsumption = { itemName: string; quantity: number; unit: string; unitCost: number | null };
export type ProdOrder = {
  id: string; number: string; producedAt: string; outputName: string; outputBatch: string | null;
  quantity: number; unit: string; materialsCost: number | null; unitCost: number | null;
  status: string; operatorName: string | null; recipeName: string | null; consumptions: ProdConsumption[];
};

const STATUS_COLOR: Record<string, string> = {
  planned: "var(--brass)", in_progress: "var(--navy)", completed: "var(--emerald-dark)", cancelled: "var(--brick)",
};

// Производствена история + проследимост (суровини → готов продукт). Отделен
// компонент — не променя съществуващия ProductionPanel (без regression).
export function ProductionHistory({ orders, kpi }: {
  orders: ProdOrder[];
  kpi: { count: number; producedValue: number; materialsCost: number; avgUnitCost: number };
}) {
  const { t, locale } = useI18n();
  const [open, setOpen] = useState<string | null>(null);
  const [q, setQ] = useState("");

  const filtered = q.trim()
    ? orders.filter((o) => (o.number + " " + o.outputName + " " + (o.outputBatch ?? "") + " " + (o.operatorName ?? "")).toLowerCase().includes(q.toLowerCase()))
    : orders;

  return (
    <div className="glass panel" style={{ padding: "18px 20px", marginTop: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 12 }}>
        <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 16, margin: 0 }}>{t("production.history.title")}</h3>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("production.history.search")} style={{ width: "auto", minWidth: 180, padding: "6px 10px", fontSize: 12.5 }} />
      </div>

      {/* KPI за текущия месец */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10, marginBottom: 14 }}>
        {[
          { label: t("production.kpi.count"), value: String(kpi.count), color: "var(--navy)" },
          { label: t("production.kpi.producedValue"), value: formatCurrency(kpi.producedValue), color: "var(--emerald-dark)" },
          { label: t("production.kpi.materialsCost"), value: formatCurrency(kpi.materialsCost), color: "var(--brass)" },
          { label: t("production.kpi.avgUnitCost"), value: formatCurrency(kpi.avgUnitCost), color: "var(--ink)" },
        ].map((k) => (
          <div key={k.label} style={{ border: "1px solid var(--border)", borderRadius: 8, padding: "8px 12px" }}>
            <div style={{ fontSize: 11, color: "var(--muted)" }}>{k.label}</div>
            <div className="num" style={{ fontSize: 16, fontWeight: 700, color: k.color }}>{k.value}</div>
          </div>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div style={{ fontSize: 12.5, color: "var(--muted)" }}>{t("production.history.empty")}</div>
      ) : (
        <div className="bi-table" style={{ overflowX: "auto" }}>
          <table>
            <thead><tr>
              <th></th><th>{t("production.history.number")}</th><th>{t("production.history.date")}</th><th>{t("production.history.product")}</th>
              <th>{t("production.history.batch")}</th><th className="num">{t("production.history.qty")}</th>
              <th className="num">{t("production.history.materials")}</th><th className="num">{t("production.history.unitCost")}</th>
              <th>{t("production.history.operator")}</th><th>{t("production.history.status")}</th>
            </tr></thead>
            <tbody>
              {filtered.map((o) => (
                <FragmentRow key={o.id} o={o} open={open === o.id} onToggle={() => setOpen(open === o.id ? null : o.id)} t={t} locale={locale} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  function FragmentRow({ o, open, onToggle, t, locale }: { o: ProdOrder; open: boolean; onToggle: () => void; t: ReturnType<typeof useI18n>["t"]; locale: string }) {
    return (
      <>
        <tr>
          <td><button onClick={onToggle} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)" }}>{open ? "▼" : "▶"}</button></td>
          <td className="num" style={{ fontWeight: 600 }}>{o.number}</td>
          <td style={{ fontSize: 12.5 }}>{new Date(o.producedAt).toLocaleDateString(locale)}</td>
          <td style={{ fontWeight: 600 }}>{o.outputName}</td>
          <td style={{ fontSize: 12.5 }}>{o.outputBatch ?? "—"}</td>
          <td className="num">{o.quantity} {o.unit}</td>
          <td className="num">{o.materialsCost != null ? formatCurrency(o.materialsCost) : "—"}</td>
          <td className="num">{o.unitCost != null ? formatCurrency(o.unitCost) : "—"}</td>
          <td style={{ fontSize: 12.5 }}>{o.operatorName ?? "—"}</td>
          <td><span style={{ fontSize: 11, fontWeight: 700, color: STATUS_COLOR[o.status] ?? "var(--ink)" }}>{t(`production.status.${o.status}`)}</span></td>
        </tr>
        {open && (
          <tr>
            <td colSpan={10} style={{ background: "rgba(0,0,0,.02)", padding: "10px 16px" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--brass)", letterSpacing: 1, marginBottom: 6 }}>{t("production.history.consumedTitle")}</div>
              {o.consumptions.length === 0 ? (
                <div style={{ fontSize: 12, color: "var(--muted)" }}>—</div>
              ) : (
                <table style={{ width: "auto" }}>
                  <thead><tr><th>{t("production.history.material")}</th><th className="num">{t("production.history.qty")}</th><th className="num">{t("production.history.unitCost")}</th><th className="num">{t("production.history.materials")}</th></tr></thead>
                  <tbody>
                    {o.consumptions.map((c, i) => (
                      <tr key={i}>
                        <td>{c.itemName}</td>
                        <td className="num">{c.quantity} {c.unit}</td>
                        <td className="num">{c.unitCost != null ? formatCurrency(c.unitCost) : "—"}</td>
                        <td className="num">{c.unitCost != null ? formatCurrency(+(c.quantity * c.unitCost).toFixed(2)) : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {o.recipeName && <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 6 }}>{t("production.history.recipe")}: {o.recipeName}</div>}
            </td>
          </tr>
        )}
      </>
    );
  }
}
