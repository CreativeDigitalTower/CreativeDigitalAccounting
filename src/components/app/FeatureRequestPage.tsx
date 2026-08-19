"use client";
import { useEffect, useState } from "react";
import { useT } from "@/components/i18n/I18nProvider";
import { FeatureRequestModal } from "@/components/app/FeatureRequestModal";

type Row = { id: string; type: string; title: string; status: string; createdAt: string };
const STATUS_COLOR: Record<string, string> = {
  new: "#C08A2D", reviewing: "#2D7DC0", need_info: "#C08A2D", approved: "var(--emerald-dark,#0F8A6A)",
  planned: "#7A6BD8", in_development: "#2D7DC0", delivered: "var(--emerald-dark,#0F8A6A)", declined: "var(--muted)", archived: "var(--muted)",
};

export function FeatureRequestPage() {
  const t = useT();
  const [rows, setRows] = useState<Row[]>([]);
  const [open, setOpen] = useState(false);

  async function load() { const r = await fetch("/api/feature-requests"); if (r.ok) setRows(await r.json()); }
  useEffect(() => { load(); }, []);

  const dt = (x: string) => new Date(x).toLocaleDateString();
  const th = { textAlign: "left" as const, padding: "7px 8px", color: "var(--muted)", fontSize: 12, whiteSpace: "nowrap" as const };
  const td = { padding: "7px 8px", fontSize: 12.5, borderTop: "1px solid rgba(217,215,200,.5)" };

  return (
    <div style={{ maxWidth: 900 }}>
      <div className="glass" style={{ borderRadius: 14, padding: "22px 26px", marginBottom: 20, borderLeft: "4px solid var(--brass)", background: "linear-gradient(120deg, var(--brass-soft), transparent)" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11.5, fontWeight: 700, color: "var(--brass)", marginBottom: 8 }}>✦ {t("featureRequest.cta.eyebrow")}</div>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 24, fontWeight: 600, margin: "0 0 8px" }}>{t("featureRequest.cta.title")}</h1>
        <p style={{ fontSize: 13.5, color: "var(--ink-soft)", margin: "0 0 16px", lineHeight: 1.55, maxWidth: 640 }}>{t("featureRequest.cta.text")}</p>
        <button className="btn btn-primary" onClick={() => setOpen(true)}>{t("featureRequest.cta.button")}</button>
      </div>

      <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 18, fontWeight: 600, margin: "0 0 10px" }}>{t("featureRequest.mine.title")}</h2>
      <div className="glass panel" style={{ overflowX: "auto" }}>
        {rows.length === 0 ? <div style={{ fontSize: 13, color: "var(--muted)" }}>{t("featureRequest.mine.empty")}</div> : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr>
              <th style={th}>{t("featureRequest.mine.date")}</th><th style={th}>{t("featureRequest.mine.title2")}</th><th style={th}>{t("featureRequest.mine.type")}</th><th style={th}>{t("featureRequest.mine.status")}</th>
            </tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td style={td}>{dt(r.createdAt)}</td>
                  <td style={td}>{r.title}</td>
                  <td style={td}>{t(`featureRequest.type.${r.type}`)}</td>
                  <td style={td}><span style={{ fontSize: 10.5, fontWeight: 700, color: "#fff", borderRadius: 10, padding: "2px 8px", background: STATUS_COLOR[r.status] ?? "var(--muted)" }}>{t(`featureRequest.status.${r.status}`)}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {open && <FeatureRequestModal onClose={() => { setOpen(false); load(); }} />}
    </div>
  );
}
