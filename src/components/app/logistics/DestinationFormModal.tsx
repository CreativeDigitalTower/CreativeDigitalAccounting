"use client";
import { useState } from "react";
import { useT } from "@/components/i18n/I18nProvider";

export type DestinationValues = {
  name: string; country: string; city: string; postalCode: string; address: string; code: string; note: string; active: boolean;
};

const EMPTY: DestinationValues = { name: "", country: "", city: "", postalCode: "", address: "", code: "", note: "", active: true };

/**
 * Модал за добавяне/редакция на дестинация (§5/§6). По подразбиране Status = Active. Само
 * Име + Държава са задължителни — не насилваме клиента да попълва ненужни полета (§4).
 */
export function DestinationFormModal({ mode, initial, onClose, onSaved }: {
  mode: "create" | "edit"; initial?: Partial<DestinationValues> & { id?: string }; onClose: () => void; onSaved: () => void;
}) {
  const t = useT();
  const [f, setF] = useState<DestinationValues>({ ...EMPTY, ...initial });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function save() {
    if (!f.name.trim()) { setErr(t("logistics.destinations.errName")); return; }
    if (!f.country.trim()) { setErr(t("logistics.destinations.errCountry")); return; }
    setBusy(true); setErr("");
    const url = mode === "create" ? "/api/logistics/destinations" : `/api/logistics/destinations/${initial?.id}`;
    const method = mode === "create" ? "POST" : "PATCH";
    const body = {
      name: f.name.trim(), country: f.country.trim() || null, city: f.city.trim() || null,
      postalCode: f.postalCode.trim() || null, address: f.address.trim() || null, code: f.code.trim() || null,
      note: f.note.trim() || null, active: f.active,
    };
    const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) { setErr(j.error ?? t("logistics.common.err")); return; }
    onSaved();
  }

  const inp = { padding: "8px 11px", fontSize: 13, width: "100%" } as const;
  const lbl = { fontSize: 12, color: "var(--muted)", display: "block", marginBottom: 3, fontWeight: 600 } as const;
  const req = <span style={{ color: "var(--brick)" }}> *</span>;

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60, padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()} className="glass panel" style={{ maxWidth: 520, width: "100%", maxHeight: "92vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 18, margin: 0 }}>{mode === "create" ? t("logistics.destinations.addTitle") : t("logistics.destinations.editTitle")}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 20, color: "var(--muted)", cursor: "pointer", lineHeight: 1 }}>×</button>
        </div>
        {err && <div style={{ color: "var(--brick)", fontSize: 12.5, marginBottom: 10 }}>{err}</div>}
        <div style={{ display: "grid", gap: 12 }}>
          <div><label style={lbl}>{t("logistics.destinations.name")}{req}</label><input style={inp} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div><label style={lbl}>{t("logistics.destinations.country")}{req}</label><input style={inp} value={f.country} onChange={(e) => setF({ ...f, country: e.target.value })} /></div>
            <div><label style={lbl}>{t("logistics.destinations.city")}</label><input style={inp} value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} /></div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div><label style={lbl}>{t("logistics.destinations.postalCode")}</label><input style={inp} value={f.postalCode} onChange={(e) => setF({ ...f, postalCode: e.target.value })} /></div>
            <div><label style={lbl}>{t("logistics.destinations.code")}</label><input style={inp} value={f.code} onChange={(e) => setF({ ...f, code: e.target.value })} /></div>
          </div>
          <div><label style={lbl}>{t("logistics.destinations.address")}</label><input style={inp} value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} /></div>
          <div><label style={lbl}>{t("logistics.common.notes")}</label><textarea style={{ ...inp, minHeight: 60, resize: "vertical", fontFamily: "inherit" }} value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} /></div>
          <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 12.5, margin: 0 }}>
            <input type="checkbox" checked={f.active} onChange={(e) => setF({ ...f, active: e.target.checked })} style={{ width: "auto" }} />
            <span>{t("logistics.destinations.activeField")}</span>
          </label>
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>{t("logistics.common.cancel")}</button>
          <button className="btn btn-primary btn-sm" disabled={busy} onClick={save}>{busy ? t("logistics.common.saving") : t("logistics.common.save")}</button>
        </div>
      </div>
    </div>
  );
}
