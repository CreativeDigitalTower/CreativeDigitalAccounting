"use client";
import { useEffect, useState } from "react";
import { useT } from "@/components/i18n/I18nProvider";

type Settings = { bgCurrency: string; mkCurrency: string; mkVatRate: number };

export function LogisticsSettings({ canManage }: { canManage: boolean }) {
  const t = useT();
  const [s, setS] = useState<Settings | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => { fetch("/api/logistics/settings").then((r) => r.ok ? r.json() : null).then(setS); }, []);

  async function save() {
    if (!s) return;
    setBusy(true); setMsg("");
    const r = await fetch("/api/logistics/settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(s) });
    setBusy(false);
    setMsg(r.ok ? t("logistics.settings.saved") : t("logistics.common.err"));
  }

  if (!s) return null;
  const inp = { padding: "6px 9px", fontSize: 13, width: 160 } as const;
  const lbl = { fontSize: 12, color: "var(--muted)", display: "block", marginBottom: 4 } as const;

  return (
    <div style={{ maxWidth: 560 }}>
      <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 600, marginBottom: 14 }}>{t("logistics.settings.title")}</h1>
      <div className="glass panel">
        <div style={{ display: "grid", gap: 14 }}>
          <div><label style={lbl}>{t("logistics.settings.bgCurrency")}</label><input style={inp} disabled={!canManage} value={s.bgCurrency} onChange={(e) => setS({ ...s, bgCurrency: e.target.value })} /></div>
          <div><label style={lbl}>{t("logistics.settings.mkCurrency")}</label><input style={inp} disabled={!canManage} value={s.mkCurrency} onChange={(e) => setS({ ...s, mkCurrency: e.target.value })} /></div>
          <div><label style={lbl}>{t("logistics.settings.mkVat")}</label><input type="number" step="0.01" style={inp} disabled={!canManage} value={s.mkVatRate} onChange={(e) => setS({ ...s, mkVatRate: Number(e.target.value) })} /></div>
        </div>
        <p style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 12 }}>{t("logistics.settings.note")}</p>
        {canManage && <button className="btn btn-primary btn-sm" disabled={busy} onClick={save} style={{ marginTop: 6 }}>{busy ? t("logistics.common.saving") : t("logistics.common.save")}</button>}
        {msg && <span style={{ fontSize: 12.5, marginLeft: 10 }}>{msg}</span>}
      </div>
    </div>
  );
}
