"use client";
import { useEffect, useState } from "react";
import { useT } from "@/components/i18n/I18nProvider";

type Settings = { bgCurrency: string; mkCurrency: string; mkVatRate: number };
type Rate = { id: string; baseCurrency: string; quoteCurrency: string; rate: number; date: string | null; source: string | null };

export function LogisticsSettings({ canManage }: { canManage: boolean }) {
  const t = useT();
  const [s, setS] = useState<Settings | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [rates, setRates] = useState<Rate[]>([]);
  const [rf, setRf] = useState({ base: "EUR", quote: "MKD", rate: "", date: "", source: "" });

  useEffect(() => { fetch("/api/logistics/settings").then((r) => r.ok ? r.json() : null).then(setS); loadRates(); }, []);
  async function loadRates() { const r = await fetch("/api/logistics/exchange-rates"); if (r.ok) setRates(await r.json()); }
  async function addRate() {
    if (!(Number(rf.rate) > 0)) return;
    setBusy(true);
    const r = await fetch("/api/logistics/exchange-rates", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ baseCurrency: rf.base, quoteCurrency: rf.quote, rate: Number(rf.rate), date: rf.date ? new Date(rf.date).toISOString() : null, source: rf.source || null }) });
    setBusy(false);
    if (r.ok) { setRf({ base: "EUR", quote: "MKD", rate: "", date: "", source: "" }); loadRates(); }
  }

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

      {/* Валутни курсове */}
      <div className="glass panel" style={{ marginTop: 16 }}>
        <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 15, margin: "0 0 10px" }}>{t("logistics.fx.title")}</h3>
        {canManage && (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "end", marginBottom: 10 }}>
            <input style={{ ...inp, width: 60 }} value={rf.base} onChange={(e) => setRf({ ...rf, base: e.target.value })} />
            <input style={{ ...inp, width: 60 }} value={rf.quote} onChange={(e) => setRf({ ...rf, quote: e.target.value })} />
            <input type="number" step="0.0001" style={{ ...inp, width: 100 }} placeholder={t("logistics.fx.rate")} value={rf.rate} onChange={(e) => setRf({ ...rf, rate: e.target.value })} />
            <input type="date" style={{ ...inp, width: 140 }} value={rf.date} onChange={(e) => setRf({ ...rf, date: e.target.value })} />
            <input style={{ ...inp, width: 120 }} placeholder={t("logistics.fx.source")} value={rf.source} onChange={(e) => setRf({ ...rf, source: e.target.value })} />
            <button className="btn btn-primary btn-sm" disabled={busy || !(Number(rf.rate) > 0)} onClick={addRate}>{t("logistics.fx.add")}</button>
          </div>
        )}
        {rates.length === 0 ? <div style={{ fontSize: 12.5, color: "var(--muted)" }}>{t("logistics.fx.empty")}</div> : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
            <tbody>
              {rates.map((r) => (
                <tr key={r.id} style={{ borderTop: "1px solid rgba(217,215,200,.4)" }}>
                  <td style={{ padding: "5px 6px" }}>1 {r.baseCurrency} = <strong className="num">{r.rate}</strong> {r.quoteCurrency}</td>
                  <td style={{ padding: "5px 6px", color: "var(--muted)" }}>{r.date ? new Date(r.date).toLocaleDateString() : "—"}</td>
                  <td style={{ padding: "5px 6px", color: "var(--muted)" }}>{r.source ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
