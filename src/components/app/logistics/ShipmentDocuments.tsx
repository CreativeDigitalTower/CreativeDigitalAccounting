"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useT } from "@/components/i18n/I18nProvider";
import { SHIPMENT_DOC_TYPES } from "@/lib/logistics/config";
import { importDossierStatus } from "@/lib/logistics/transport";
import { confirmDelete } from "@/lib/confirmDelete";

type Doc = { id: string; docType: string; name: string | null; number: string | null; docDate: string | null; note: string | null; originalFilename: string | null; mimeType: string | null; createdAt: string };
const fileToDataUrl = (f: File) => new Promise<string>((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.onerror = rej; r.readAsDataURL(f); });

export function ShipmentDocuments({ shipmentId, canManage }: { shipmentId: string; canManage: boolean }) {
  const t = useT();
  const [docs, setDocs] = useState<Doc[]>([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [form, setForm] = useState({ docType: "cmr", name: "", number: "", docDate: "" });
  const fileRef = useRef<HTMLInputElement>(null);

  async function load() { const r = await fetch(`/api/logistics/shipments/${shipmentId}/documents`); if (r.ok) setDocs(await r.json()); }
  useEffect(() => { load(); }, [shipmentId]);

  const dossier = useMemo(() => importDossierStatus(docs.map((d) => d.docType)), [docs]);

  async function upload() {
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    setBusy(true); setErr("");
    const dataUrl = await fileToDataUrl(file);
    const r = await fetch(`/api/logistics/shipments/${shipmentId}/documents`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, docDate: form.docDate ? new Date(form.docDate).toISOString() : null, originalFilename: file.name, mimeType: file.type || "application/octet-stream", size: file.size, dataUrl }),
    });
    const j = await r.json().catch(() => ({})); setBusy(false);
    if (!r.ok) { setErr(j.error ?? t("logistics.common.err")); return; }
    setForm({ docType: "cmr", name: "", number: "", docDate: "" }); if (fileRef.current) fileRef.current.value = ""; setOpen(false); load();
  }
  async function del(id: string) {
    if (!(await confirmDelete())) return;
    const r = await fetch(`/api/logistics/shipments/${shipmentId}/documents/${id}`, { method: "DELETE" });
    if (r.ok) load();
  }

  const dt = (s: string | null) => s ? new Date(s).toLocaleDateString() : "—";
  const inp = { padding: "5px 7px", fontSize: 12.5 } as const;
  const td = { padding: "5px 6px", fontSize: 12, borderTop: "1px solid rgba(217,215,200,.4)" };

  return (
    <div>
      {/* Досие на вноса */}
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 4 }}>
          {t("logistics.dossier.title")} · {dossier.complete ? <span style={{ color: "var(--emerald-dark,#0F8A6A)" }}>{t("logistics.dossier.complete")}</span> : <span style={{ color: "var(--brass)" }}>{t("logistics.dossier.incomplete")}</span>}
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {dossier.items.map((it) => (
            <span key={it.docType} style={{ fontSize: 11, padding: "2px 8px", borderRadius: 8, background: it.present ? "rgba(15,138,106,.12)" : "rgba(197,84,60,.1)", color: it.present ? "var(--emerald-dark,#0F8A6A)" : "var(--brick)" }}>
              {t(`logistics.docTypes.${it.docType}`)} {it.present ? t("logistics.dossier.present") : t("logistics.dossier.missing")}
            </span>
          ))}
        </div>
      </div>

      {err && <div style={{ color: "var(--brick)", fontSize: 12, marginBottom: 6 }}>{err}</div>}
      {canManage && (
        <div style={{ marginBottom: 8 }}>
          {!open ? <button className="btn btn-ghost btn-sm" onClick={() => setOpen(true)}>{t("logistics.shipDocs.add")}</button> : (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "end", border: "1px solid rgba(217,215,200,.6)", borderRadius: 8, padding: 8 }}>
              <select style={inp} value={form.docType} onChange={(e) => setForm({ ...form, docType: e.target.value })}>
                {SHIPMENT_DOC_TYPES.map((dtp) => <option key={dtp} value={dtp}>{t(`logistics.docTypes.${dtp}`)}</option>)}
              </select>
              <input style={{ ...inp, width: 120 }} placeholder={t("logistics.shipDocs.name")} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <input style={{ ...inp, width: 90 }} placeholder={t("logistics.shipDocs.number")} value={form.number} onChange={(e) => setForm({ ...form, number: e.target.value })} />
              <input type="date" style={inp} value={form.docDate} onChange={(e) => setForm({ ...form, docDate: e.target.value })} />
              <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png,image/*,application/pdf" style={{ fontSize: 11 }} />
              <button className="btn btn-primary btn-sm" disabled={busy} onClick={upload}>{t("logistics.shipDocs.add")}</button>
              <button className="btn btn-ghost btn-sm" onClick={() => setOpen(false)}>✕</button>
            </div>
          )}
        </div>
      )}

      {docs.length === 0 ? <div style={{ fontSize: 12.5, color: "var(--muted)" }}>{t("logistics.shipDocs.empty")}</div> : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr style={{ textAlign: "left", color: "var(--muted)", fontSize: 11 }}>
              <th style={{ padding: "4px 6px" }}>{t("logistics.shipDocs.type")}</th><th style={{ padding: "4px 6px" }}>{t("logistics.shipDocs.name")}</th>
              <th style={{ padding: "4px 6px" }}>{t("logistics.shipDocs.number")}</th><th style={{ padding: "4px 6px" }}>{t("logistics.shipDocs.date")}</th>
              <th style={{ padding: "4px 6px", textAlign: "right" }}></th>
            </tr></thead>
            <tbody>
              {docs.map((d) => (
                <tr key={d.id}>
                  <td style={td}>{t(`logistics.docTypes.${d.docType}`)}</td>
                  <td style={td}>{d.name ?? d.originalFilename ?? "—"}</td>
                  <td style={td}>{d.number ?? "—"}</td>
                  <td style={td}>{dt(d.docDate)}</td>
                  <td style={{ ...td, textAlign: "right", whiteSpace: "nowrap" }}>
                    <a className="btn btn-ghost btn-sm" href={`/api/logistics/shipments/${shipmentId}/documents/${d.id}/file`} target="_blank" rel="noreferrer">{t("logistics.shipDocs.download")}</a>{" "}
                    {canManage && <button className="btn btn-ghost btn-sm" style={{ color: "var(--brick)" }} onClick={() => del(d.id)}>{t("logistics.shipDocs.delete")}</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
