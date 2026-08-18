"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useT } from "@/components/i18n/I18nProvider";
import { FASHION_BASE_PATH } from "@/lib/fashion/config";

type Row = { id: string; period: string; status: string; revenue: number; cogs: number; grossProfit: number; units: number; lineCount: number };

export function SalesClient({ canManage }: { canManage: boolean }) {
  const t = useT();
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>([]);
  const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7));
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function load() { const r = await fetch("/api/fashion/sales"); if (r.ok) setRows(await r.json()); }
  useEffect(() => { load(); }, []);

  async function create() {
    setBusy(true); setMsg("");
    const r = await fetch("/api/fashion/sales", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ period }) });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    if (r.ok) router.push(`${FASHION_BASE_PATH}/sales/${j.id}`); else setMsg(`⚠️ ${j.error ?? ""}`);
  }

  const th = { textAlign: "left" as const, padding: "7px 8px", color: "var(--muted)", fontSize: 12, whiteSpace: "nowrap" as const };
  const td = { padding: "7px 8px", fontSize: 12.5, borderTop: "1px solid rgba(217,215,200,.5)" };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
        <Link href={FASHION_BASE_PATH} style={{ color: "var(--muted)", textDecoration: "none", fontSize: 13 }}>← {t("fashion.title")}</Link>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 600, margin: 0 }}>{t("fashion.nav.sales")}</h1>
        {canManage && (
          <div style={{ marginLeft: "auto", display: "flex", gap: 6, alignItems: "center" }}>
            <input type="month" value={period} onChange={(e) => setPeriod(e.target.value)} style={{ padding: "6px 9px", fontSize: 12.5 }} />
            <button className="btn btn-primary btn-sm" disabled={busy} onClick={create}>{t("fashion.sales.add")}</button>
          </div>
        )}
      </div>
      {msg && <div style={{ fontSize: 12.5, marginBottom: 10 }}>{msg}</div>}

      <div className="glass panel" style={{ overflowX: "auto" }}>
        {rows.length === 0 ? <div style={{ fontSize: 13, color: "var(--muted)" }}>{t("fashion.sales.empty")}</div> : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr>
              <th style={th}>{t("fashion.sales.period")}</th><th style={th}>{t("fashion.styles.status")}</th><th style={th}>{t("fashion.sales.units")}</th>
              <th style={th}>{t("fashion.sales.revenue")}</th><th style={th}>{t("fashion.sales.cogs")}</th><th style={th}>{t("fashion.sales.grossProfit")}</th>
            </tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td style={td} className="num"><Link href={`${FASHION_BASE_PATH}/sales/${r.id}`} style={{ fontWeight: 600 }}>{r.period}</Link></td>
                  <td style={td}><span style={{ fontSize: 10.5, fontWeight: 700, color: "#fff", borderRadius: 10, padding: "2px 8px", background: r.status === "finalized" ? "var(--emerald-dark,#0F8A6A)" : "#C08A2D" }}>{t(`fashion.sales.st_${r.status}`)}</span></td>
                  <td style={td} className="num">{r.units || "—"}</td>
                  <td style={td} className="num">{r.revenue.toFixed(2)} €</td>
                  <td style={td} className="num">{r.cogs.toFixed(2)} €</td>
                  <td style={td} className="num">{r.grossProfit.toFixed(2)} €</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
