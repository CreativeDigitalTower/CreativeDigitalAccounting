"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useT } from "@/components/i18n/I18nProvider";
import { REQUEST_STATUSES } from "@/lib/featureRequest/config";

type Row = { id: string; companyName: string; eik: string | null; type: string; title: string; status: string; priority: string | null; planSnapshot: string | null; contactEmail: string; createdAt: string; lastActivityAt: string; attachments: number };
type Kpi = Record<string, number> & { avgResponseHours: number };

export function AdminFeatureRequests() {
  const t = useT();
  const [rows, setRows] = useState<Row[]>([]);
  const [kpi, setKpi] = useState<Kpi | null>(null);
  const [status, setStatus] = useState("");

  async function load() {
    const p = new URLSearchParams(); if (status) p.set("status", status);
    const r = await fetch(`/api/admin/feature-requests?${p}`);
    if (r.ok) { const j = await r.json(); setRows(j.rows); setKpi(j.kpi); }
  }
  useEffect(() => { load(); }, [status]);

  const dt = (x: string) => new Date(x).toLocaleDateString();
  const th = { textAlign: "left" as const, padding: "7px 8px", color: "var(--muted)", fontSize: 12, whiteSpace: "nowrap" as const };
  const td = { padding: "7px 8px", fontSize: 12.5, borderTop: "1px solid rgba(217,215,200,.5)" };

  return (
    <div style={{ maxWidth: 1100 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
        <Link href="/dashboard/admin" style={{ color: "var(--muted)", textDecoration: "none", fontSize: 13 }}>← Super Admin</Link>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 600, margin: 0 }}>{t("featureRequest.admin.title")}</h1>
      </div>

      {kpi && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))", gap: 10, marginBottom: 14 }}>
          {[["new", kpi.new], ["reviewing", kpi.reviewing], ["approved", kpi.approved], ["in_development", kpi.in_development], ["delivered", kpi.delivered]].map(([k, v]) => (
            <div key={k as string} className="glass panel" style={{ padding: "12px 14px" }}>
              <div style={{ fontSize: 11, color: "var(--muted)" }}>{t(`featureRequest.status.${k}`)}</div>
              <div className="num" style={{ fontSize: 22, fontWeight: 700 }}>{v ?? 0}</div>
            </div>
          ))}
          <div className="glass panel" style={{ padding: "12px 14px" }}>
            <div style={{ fontSize: 11, color: "var(--muted)" }}>{t("featureRequest.admin.avgResponse")}</div>
            <div className="num" style={{ fontSize: 22, fontWeight: 700 }}>{kpi.avgResponseHours}ч</div>
          </div>
        </div>
      )}

      <div style={{ marginBottom: 12 }}>
        <select value={status} onChange={(e) => setStatus(e.target.value)} style={{ padding: "6px 9px", fontSize: 12.5 }}>
          <option value="">{t("featureRequest.admin.allStatuses")}</option>
          {REQUEST_STATUSES.map((s) => <option key={s} value={s}>{t(`featureRequest.status.${s}`)}</option>)}
        </select>
      </div>

      <div className="glass panel" style={{ overflowX: "auto" }}>
        {rows.length === 0 ? <div style={{ fontSize: 13, color: "var(--muted)" }}>{t("featureRequest.admin.empty")}</div> : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr>
              <th style={th}>{t("featureRequest.admin.date")}</th><th style={th}>{t("featureRequest.admin.company")}</th><th style={th}>{t("featureRequest.admin.type")}</th>
              <th style={th}>{t("featureRequest.admin.reqTitle")}</th><th style={th}>{t("featureRequest.admin.plan")}</th><th style={th}>{t("featureRequest.admin.status")}</th><th style={th}>{t("featureRequest.admin.activity")}</th>
            </tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td style={td}>{dt(r.createdAt)}</td>
                  <td style={td}><Link href={`/dashboard/admin/feature-requests/${r.id}`} style={{ fontWeight: 600 }}>{r.companyName}</Link>{r.eik ? <div style={{ fontSize: 11, color: "var(--muted)" }} className="num">{r.eik}</div> : null}</td>
                  <td style={td}>{t(`featureRequest.type.${r.type}`)}</td>
                  <td style={td}>{r.title}</td>
                  <td style={td}>{r.planSnapshot ?? "—"}</td>
                  <td style={td}>{t(`featureRequest.status.${r.status}`)}</td>
                  <td style={td}>{dt(r.lastActivityAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
