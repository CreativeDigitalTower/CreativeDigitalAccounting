"use client";
import { useState } from "react";
import { useT } from "@/components/i18n/I18nProvider";

export type ClientForm = {
  id?: string; name: string; eik: string; vatNumber: string; address: string;
  city: string; country: string; phone: string; contactEmail: string; contactPerson: string;
};

const EMPTY: ClientForm = { name: "", eik: "", vatNumber: "", address: "", city: "", country: "", phone: "", contactEmail: "", contactPerson: "" };

// Общ модал за създаване/редакция на краен клиент (§26-§32). Reuse-ва реалния CRM Client
// през API-то — без отделен LogisticsClient модел. Snapshot-ите на доставките не се пипат (§31).
export function ClientFormModal({ initial, onClose, onSaved }: { initial: ClientForm | null; onClose: () => void; onSaved: () => void }) {
  const t = useT();
  const [f, setF] = useState<ClientForm>(initial ?? EMPTY);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const isEdit = !!initial?.id;

  async function submit() {
    setErr("");
    if (f.name.trim().length < 2) { setErr(t("logistics.clients.fName")); return; }
    setBusy(true);
    const payload = { name: f.name, eik: f.eik || null, vatNumber: f.vatNumber || null, address: f.address || null, city: f.city || null, country: f.country || null, phone: f.phone || null, contactEmail: f.contactEmail || null, contactPerson: f.contactPerson || null };
    const r = isEdit
      ? await fetch(`/api/logistics/clients/${initial!.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
      : await fetch(`/api/logistics/clients`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) { setErr(j.error ?? t("logistics.common.err")); return; }
    if (!isEdit && j.duplicate) { setErr(t("logistics.clients.duplicate")); setTimeout(onSaved, 900); return; }
    onSaved();
  }

  const lbl = { fontSize: 11.5, color: "var(--muted)", display: "block", marginBottom: 3 } as const;
  const inp = { padding: "7px 9px", fontSize: 13, width: "100%" } as const;
  const field = (key: keyof ClientForm, labelKey: string, full = false) => (
    <div style={full ? { gridColumn: "1 / -1" } : undefined}>
      <label style={lbl}>{t(labelKey)}</label>
      <input style={inp} value={f[key]} onChange={(e) => setF({ ...f, [key]: e.target.value })} />
    </div>
  );

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(20,30,25,.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()} className="glass panel" style={{ maxWidth: 560, width: "100%", maxHeight: "90vh", overflowY: "auto", background: "var(--paper)" }}>
        <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 17, margin: "0 0 12px" }}>{t(isEdit ? "logistics.clients.editClientTitle" : "logistics.clients.newClientTitle")}</h3>
        {err && <div style={{ color: "var(--brick)", fontSize: 12.5, marginBottom: 10 }}>{err}</div>}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {field("name", "logistics.clients.fName", true)}
          {field("eik", "logistics.clients.fEik")}
          {field("vatNumber", "logistics.clients.fVat")}
          {field("address", "logistics.clients.fAddress", true)}
          {field("city", "logistics.clients.fCity")}
          {field("country", "logistics.clients.fCountry")}
          {field("phone", "logistics.clients.fPhone")}
          {field("contactEmail", "logistics.clients.fEmail")}
          {field("contactPerson", "logistics.clients.fContact", true)}
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
          <button className="btn btn-ghost btn-sm" onClick={onClose} disabled={busy}>{t("logistics.clients.cancel")}</button>
          <button className="btn btn-primary btn-sm" onClick={submit} disabled={busy}>{t("logistics.clients.save")}</button>
        </div>
      </div>
    </div>
  );
}
