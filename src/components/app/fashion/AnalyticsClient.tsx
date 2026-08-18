"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useT } from "@/components/i18n/I18nProvider";
import { FASHION_BASE_PATH } from "@/lib/fashion/config";
import { ForecastPanel } from "@/components/app/fashion/ForecastPanel";

type Rank = { key: string; value: number };
type StyleRow = { code: string; units: number; revenue: number; grossProfit: number; grossMarginPct: number };
type Data = {
  kpis: { sellThroughRate: number; defectRate: number; materialWastePct: number; totalRevenue: number };
  salesByStyle: StyleRow[]; salesBySize: Rank[]; salesByColor: Rank[];
  marginByStyle: Rank[]; bestSellers: Rank[]; slowMovers: Rank[];
};

export function AnalyticsClient({ collections, canManageFg }: { collections: string[]; canManageFg: boolean }) {
  const t = useT();
  const [d, setD] = useState<Data | null>(null);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [collection, setCollection] = useState("");

  const load = useCallback(async () => {
    const p = new URLSearchParams();
    if (from) p.set("from", from); if (to) p.set("to", to); if (collection) p.set("collection", collection);
    const r = await fetch(`/api/fashion/analytics?${p}`);
    if (r.ok) setD(await r.json());
  }, [from, to, collection]);
  useEffect(() => { load(); }, [load]);

  const th = { textAlign: "left" as const, padding: "6px 8px", color: "var(--muted)", fontSize: 11.5, whiteSpace: "nowrap" as const };
  const td = { padding: "6px 8px", fontSize: 12.5, borderTop: "1px solid rgba(217,215,200,.5)" };
  const sel = { padding: "6px 9px", fontSize: 12.5 } as const;

  const RankList = ({ title, items, suffix }: { title: string; items: Rank[]; suffix?: string }) => (
    <div className="glass panel">
      <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 14, margin: "0 0 6px" }}>{title}</h3>
      {items.length === 0 ? <div style={{ fontSize: 12, color: "var(--muted)" }}>—</div> : items.map((x) => (
        <div key={x.key} style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, padding: "2px 0" }}><span>{x.key}</span><span className="num">{x.value}{suffix ?? ""}</span></div>
      ))}
    </div>
  );

  return (
    <div style={{ maxWidth: 1040 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
        <Link href={FASHION_BASE_PATH} style={{ color: "var(--muted)", textDecoration: "none", fontSize: 13 }}>← {t("fashion.title")}</Link>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 600, margin: 0 }}>{t("fashion.nav.analytics")}</h1>
      </div>

      <div className="glass panel" style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 14 }}>
        <label style={{ fontSize: 12 }}>{t("fashion.an.from")} <input type="month" style={{ ...sel, marginLeft: 4 }} value={from} onChange={(e) => setFrom(e.target.value)} /></label>
        <label style={{ fontSize: 12 }}>{t("fashion.an.to")} <input type="month" style={{ ...sel, marginLeft: 4 }} value={to} onChange={(e) => setTo(e.target.value)} /></label>
        <select style={sel} value={collection} onChange={(e) => setCollection(e.target.value)}>
          <option value="">{t("fashion.an.allCollections")}</option>{collections.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {d && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 10, marginBottom: 14 }}>
            {[["sellThrough", `${d.kpis.sellThroughRate}%`], ["defectRate", `${d.kpis.defectRate}%`], ["waste", `${d.kpis.materialWastePct}%`], ["revenue", `${d.kpis.totalRevenue.toFixed(2)} €`]].map(([k, v]) => (
              <div key={k} className="glass panel" style={{ padding: "12px 14px" }}>
                <div style={{ fontSize: 11, color: "var(--muted)" }}>{t(`fashion.an.${k}`)}</div>
                <div className="num" style={{ fontSize: 20, fontWeight: 700 }}>{v}</div>
              </div>
            ))}
          </div>

          <div className="glass panel" style={{ overflowX: "auto", marginBottom: 14 }}>
            <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 15, margin: "0 0 8px" }}>{t("fashion.an.salesByStyle")}</h3>
            {d.salesByStyle.length === 0 ? <div style={{ fontSize: 12.5, color: "var(--muted)" }}>{t("fashion.an.noData")}</div> : (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr><th style={th}>{t("fashion.styles.code")}</th><th style={th}>{t("fashion.sales.units")}</th><th style={th}>{t("fashion.sales.revenue")}</th><th style={th}>{t("fashion.sales.grossProfit")}</th><th style={th}>{t("fashion.cost.margin")}</th></tr></thead>
                <tbody>
                  {d.salesByStyle.map((s) => (
                    <tr key={s.code}><td style={td} className="num">{s.code}</td><td style={td} className="num">{s.units}</td><td style={td} className="num">{s.revenue.toFixed(2)} €</td><td style={td} className="num">{s.grossProfit.toFixed(2)} €</td><td style={td} className="num">{s.grossMarginPct}%</td></tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 12 }}>
            <RankList title={t("fashion.an.bestSellers")} items={d.bestSellers} />
            <RankList title={t("fashion.an.slowMovers")} items={d.slowMovers} />
            <RankList title={t("fashion.an.marginByStyle")} items={d.marginByStyle} suffix="%" />
            <RankList title={t("fashion.an.salesBySize")} items={d.salesBySize} />
            <RankList title={t("fashion.an.salesByColor")} items={d.salesByColor} />
          </div>

          <ForecastPanel canManage={canManageFg} />
        </>
      )}
    </div>
  );
}
