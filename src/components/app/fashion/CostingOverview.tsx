"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useT } from "@/components/i18n/I18nProvider";
import { FASHION_BASE_PATH } from "@/lib/fashion/config";
import { StatusBadge } from "@/components/app/fashion/StatusBadge";

type Row = { id: string; code: string; name: string; status: string; manufacturing: number; fullyLoaded: number; retailPrice: number | null; grossMarginPct: number };

export function CostingOverview() {
  const t = useT();
  const [rows, setRows] = useState<Row[]>([]);
  useEffect(() => { fetch("/api/fashion/costing").then((r) => r.ok ? r.json() : []).then(setRows); }, []);

  const th = { textAlign: "left" as const, padding: "7px 8px", color: "var(--muted)", fontSize: 12, whiteSpace: "nowrap" as const };
  const td = { padding: "7px 8px", fontSize: 12.5, borderTop: "1px solid rgba(217,215,200,.5)" };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
        <Link href={FASHION_BASE_PATH} style={{ color: "var(--muted)", textDecoration: "none", fontSize: 13 }}>← {t("fashion.title")}</Link>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 600, margin: 0 }}>{t("fashion.nav.costing")}</h1>
      </div>
      <p style={{ fontSize: 12.5, color: "var(--muted)", marginBottom: 14 }}>{t("fashion.cost.overviewIntro")}</p>

      <div className="glass panel" style={{ overflowX: "auto" }}>
        {rows.length === 0 ? <div style={{ fontSize: 13, color: "var(--muted)" }}>{t("fashion.styles.empty")}</div> : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr>
              <th style={th}>{t("fashion.styles.code")}</th><th style={th}>{t("fashion.styles.name")}</th><th style={th}>{t("fashion.styles.status")}</th>
              <th style={th}>{t("fashion.cost.manufacturing")}</th><th style={th}>{t("fashion.cost.fullyLoaded")}</th><th style={th}>{t("fashion.cost.retail")}</th><th style={th}>{t("fashion.cost.margin")}</th><th style={th} />
            </tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td style={td} className="num"><Link href={`${FASHION_BASE_PATH}/styles/${r.id}/costing`} style={{ fontWeight: 600 }}>{r.code}</Link></td>
                  <td style={td}>{r.name}</td>
                  <td style={td}><StatusBadge status={r.status} /></td>
                  <td style={td} className="num">{r.manufacturing.toFixed(2)} €</td>
                  <td style={td} className="num">{r.fullyLoaded.toFixed(2)} €</td>
                  <td style={td} className="num">{r.retailPrice != null ? `${r.retailPrice.toFixed(2)} €` : "—"}</td>
                  <td style={td} className="num">{r.retailPrice ? `${r.grossMarginPct}%` : "—"}</td>
                  <td style={td}><Link href={`${FASHION_BASE_PATH}/styles/${r.id}/costing`} className="btn btn-ghost btn-sm" style={{ fontSize: 11, padding: "2px 10px" }}>{t("fashion.bom.edit")}</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
