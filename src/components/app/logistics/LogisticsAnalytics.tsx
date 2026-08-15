"use client";
import { useEffect, useState } from "react";
import { useT } from "@/components/i18n/I18nProvider";

type Client = { client: string; revenue: number; quantity: number };
type Product = { product: string; soldQuantity: number; salesRevenue: number; avgSalePrice: number | null; avgPurchasePrice: number | null; marginPerUnit: number | null };
type Cmp = { label: string; prev: number; cur: number; changePct: number | null };
type Data = {
  finances: { purchase: number; costs: number; revenue: number; gross: number; marginPct: number | null };
  topByRevenue: Client[]; topByTons: Client[]; products: Product[];
  comparison: { prevYear: number; curYear: number; revenue: Cmp; quantity: Cmp };
};

export function LogisticsAnalytics() {
  const t = useT();
  const [d, setD] = useState<Data | null>(null);
  useEffect(() => { fetch("/api/logistics/analytics").then((r) => r.ok ? r.json() : null).then(setD); }, []);
  if (!d) return null;

  const th = { textAlign: "left" as const, padding: "6px 8px", color: "var(--muted)", fontSize: 11.5 };
  const td = { padding: "6px 8px", fontSize: 12.5, borderTop: "1px solid rgba(217,215,200,.5)" };
  const kpi = (l: string, v: React.ReactNode) => (<div className="glass kpi-card"><div style={{ fontSize: 11.5, color: "var(--muted)" }}>{l}</div><div className="num" style={{ fontSize: 17, fontWeight: 600 }}>{v}</div></div>);
  const chg = (c: Cmp) => c.changePct == null ? "—" : <span style={{ color: c.changePct >= 0 ? "var(--emerald-dark,#0F8A6A)" : "var(--brick)" }}>{c.changePct >= 0 ? "+" : ""}{c.changePct}%</span>;

  const ClientTable = ({ title, rows, valLabel, val }: { title: string; rows: Client[]; valLabel: string; val: (c: Client) => number }) => (
    <div className="glass panel">
      <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 6 }}>{title}</div>
      {rows.length === 0 ? <div style={{ fontSize: 12.5, color: "var(--muted)" }}>{t("logistics.analytics.empty")}</div> : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr><th style={th}>{t("logistics.analytics.client")}</th><th style={{ ...th, textAlign: "right" }}>{valLabel}</th></tr></thead>
          <tbody>{rows.map((c, i) => <tr key={i}><td style={td}>{c.client}</td><td style={{ ...td, textAlign: "right" }} className="num">{val(c)}</td></tr>)}</tbody>
        </table>
      )}
    </div>
  );

  return (
    <div style={{ maxWidth: 1000 }}>
      <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 600, marginBottom: 14 }}>{t("logistics.analytics.title")}</h1>

      <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 15, margin: "0 0 8px" }}>{t("logistics.analytics.finances")}</h3>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))", gap: 10, marginBottom: 16 }}>
        {kpi(t("logistics.analytics.purchase"), d.finances.purchase)}
        {kpi(t("logistics.analytics.costs"), d.finances.costs)}
        {kpi(t("logistics.analytics.revenue"), d.finances.revenue)}
        {kpi(t("logistics.analytics.gross"), d.finances.gross)}
        {kpi(t("logistics.analytics.marginPct"), d.finances.marginPct != null ? `${d.finances.marginPct}%` : "—")}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16 }}>
        <ClientTable title={t("logistics.analytics.topRevenue")} rows={d.topByRevenue} valLabel={t("logistics.analytics.revenue")} val={(c) => c.revenue} />
        <ClientTable title={t("logistics.analytics.topTons")} rows={d.topByTons} valLabel="t" val={(c) => c.quantity} />
      </div>

      <div className="glass panel" style={{ marginBottom: 16, overflowX: "auto" }}>
        <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 6 }}>{t("logistics.analytics.products")}</div>
        {d.products.length === 0 ? <div style={{ fontSize: 12.5, color: "var(--muted)" }}>{t("logistics.analytics.empty")}</div> : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr>
              <th style={th}>{t("logistics.analytics.product")}</th><th style={{ ...th, textAlign: "right" }}>{t("logistics.analytics.soldQty")}</th>
              <th style={{ ...th, textAlign: "right" }}>{t("logistics.analytics.revenue")}</th><th style={{ ...th, textAlign: "right" }}>{t("logistics.analytics.avgSale")}</th>
              <th style={{ ...th, textAlign: "right" }}>{t("logistics.analytics.avgPurchase")}</th><th style={{ ...th, textAlign: "right" }}>{t("logistics.analytics.marginUnit")}</th>
            </tr></thead>
            <tbody>
              {d.products.map((p, i) => (
                <tr key={i}>
                  <td style={td}>{p.product}</td>
                  <td style={{ ...td, textAlign: "right" }} className="num">{p.soldQuantity}</td>
                  <td style={{ ...td, textAlign: "right" }} className="num">{p.salesRevenue}</td>
                  <td style={{ ...td, textAlign: "right" }} className="num">{p.avgSalePrice ?? "—"}</td>
                  <td style={{ ...td, textAlign: "right" }} className="num">{p.avgPurchasePrice ?? "—"}</td>
                  <td style={{ ...td, textAlign: "right", fontWeight: 600, color: p.marginPerUnit != null && p.marginPerUnit < 0 ? "var(--brick)" : "inherit" }} className="num">{p.marginPerUnit ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="glass panel">
        <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 6 }}>{t("logistics.analytics.comparison")} · {d.comparison.prevYear} → {d.comparison.curYear}</div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr><th style={th}></th><th style={{ ...th, textAlign: "right" }}>{d.comparison.prevYear}</th><th style={{ ...th, textAlign: "right" }}>{d.comparison.curYear}</th><th style={{ ...th, textAlign: "right" }}>Δ</th></tr></thead>
          <tbody>
            <tr><td style={td}>{t("logistics.analytics.revenue")}</td><td style={{ ...td, textAlign: "right" }} className="num">{d.comparison.revenue.prev}</td><td style={{ ...td, textAlign: "right" }} className="num">{d.comparison.revenue.cur}</td><td style={{ ...td, textAlign: "right" }}>{chg(d.comparison.revenue)}</td></tr>
            <tr><td style={td}>{t("logistics.analytics.quantity")}</td><td style={{ ...td, textAlign: "right" }} className="num">{d.comparison.quantity.prev}</td><td style={{ ...td, textAlign: "right" }} className="num">{d.comparison.quantity.cur}</td><td style={{ ...td, textAlign: "right" }}>{chg(d.comparison.quantity)}</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
