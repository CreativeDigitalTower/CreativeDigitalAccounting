"use client";
import { useEffect, useState } from "react";
import { useT } from "@/components/i18n/I18nProvider";

type Info = { lastRegularNumber: string | null; nextNumber: string; overrideSet: boolean };

// Настройки → Номерация на документи (§10/§11). Показва последен използван редовен номер и
// следващия автоматичен номер; позволява ръчна промяна на следващия номер (валидация server-side).
export function InvoiceNumberingSettings() {
  const t = useT();
  const [info, setInfo] = useState<Info | null>(null);
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState("");
  const [err, setErr] = useState("");
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  async function load() {
    const r = await fetch("/api/company/invoice-sequence");
    if (r.ok) { const j = await r.json(); setInfo(j); setVal(j.nextNumber); }
  }
  useEffect(() => { void load(); }, []);

  async function save() {
    setErr(""); setBusy(true);
    const r = await fetch("/api/company/invoice-sequence", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ nextNumber: val }) });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) { setErr(j.error ?? t("account.numbering.err")); return; }
    setInfo(j); setVal(j.nextNumber); setEditing(false); setSaved(true); setTimeout(() => setSaved(false), 1500);
  }

  if (!info) return null;
  const box = { fontFamily: "'IBM Plex Mono', monospace", fontSize: 18, fontWeight: 600 } as const;

  return (
    <div className="glass panel" style={{ padding: "24px 28px", marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 16, margin: 0 }}>{t("account.numbering.title")}</h2>
        {saved && <span style={{ fontSize: 12, color: "var(--emerald-dark)" }}>{t("account.numbering.saved")}</span>}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 14, marginBottom: 12 }}>
        <div>
          <label style={{ fontSize: 12, color: "var(--muted)" }}>{t("account.numbering.lastUsed")}</label>
          <div style={box}>{info.lastRegularNumber ?? "—"}</div>
        </div>
        <div>
          <label style={{ fontSize: 12, color: "var(--muted)" }}>{t("account.numbering.next")}</label>
          <div style={{ ...box, color: "var(--emerald-dark)" }}>{info.nextNumber}</div>
        </div>
      </div>

      {err && <div style={{ color: "var(--brick)", fontSize: 12.5, marginBottom: 10 }}>{err}</div>}

      {!editing ? (
        <button className="btn btn-ghost btn-sm" onClick={() => { setEditing(true); setVal(info.nextNumber); }}>{t("account.numbering.change")}</button>
      ) : (
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <input value={val} onChange={(e) => setVal(e.target.value)} placeholder="0002700200" style={{ width: 180, fontFamily: "'IBM Plex Mono', monospace" }} />
          <button className="btn btn-primary btn-sm" disabled={busy} onClick={save}>{t("account.numbering.save")}</button>
          <button className="btn btn-ghost btn-sm" disabled={busy} onClick={() => { setEditing(false); setErr(""); }}>{t("account.numbering.cancel")}</button>
        </div>
      )}
      <p style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 10 }}>{t("account.numbering.helper")}</p>
    </div>
  );
}
