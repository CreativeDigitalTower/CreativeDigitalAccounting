"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useT } from "@/components/i18n/I18nProvider";
import { SearchableSelect } from "@/components/app/logistics/SearchableSelect";
import { confirmDelete } from "@/lib/confirmDelete";

type Profile = { trailerReg: string | null; carrierId: string | null; defaultDriver: string | null; ownershipType: string | null };
type Vehicle = { id: string; registration: string; active: boolean; notes: string | null; logisticsProfile: Profile | null; aliases: { id: string; alias: string }[] };
type Carrier = { id: string; name: string };
type Doc = { id: string; docType: string | null; name: string | null; number: string | null; issueDate: string | null; validTo: string | null; originalFilename: string | null; mimeType: string | null };
type History = { trips: number; totalTons: number; firstTrip: string | null; lastTrip: string | null; products: string[]; destinations: string[] };

const DOC_TYPES = ["registration", "insurance", "inspection", "license", "permit", "contract", "certificate", "other"];
const OWNERSHIP = ["own", "carrier", "subcontractor", "unspecified"];
const fileToDataUrl = (f: File) => new Promise<string>((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.onerror = rej; r.readAsDataURL(f); });

export function VehicleDossier({ vehicle, carriers, canManage, canDocs, history }: { vehicle: Vehicle; carriers: Carrier[]; canManage: boolean; canDocs: boolean; history?: History }) {
  const t = useT();
  const [v, setV] = useState(vehicle);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [docForm, setDocForm] = useState({ docType: "registration", name: "", number: "", validTo: "" });
  const fileRef = useRef<HTMLInputElement>(null);

  async function loadDocs() { const r = await fetch(`/api/logistics/vehicles/${v.id}/documents`); if (r.ok) setDocs(await r.json()); }
  useEffect(() => { loadDocs(); }, [v.id]);

  async function save(patch: Record<string, unknown>) {
    setBusy(true); setErr("");
    const r = await fetch(`/api/logistics/vehicles/${v.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) { setErr(j.error ?? t("logistics.common.err")); return; }
    if (j?.id) setV({ ...v, ...j });
  }

  async function uploadDoc() {
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    setBusy(true); setErr("");
    const dataUrl = await fileToDataUrl(file);
    const r = await fetch(`/api/logistics/vehicles/${v.id}/documents`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...docForm, validTo: docForm.validTo ? new Date(docForm.validTo).toISOString() : null, originalFilename: file.name, mimeType: file.type || "application/octet-stream", size: file.size, dataUrl }),
    });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) { setErr(j.error ?? t("logistics.common.err")); return; }
    setDocForm({ docType: "registration", name: "", number: "", validTo: "" });
    if (fileRef.current) fileRef.current.value = "";
    loadDocs();
  }

  async function delDoc(id: string) {
    if (!(await confirmDelete())) return;
    const r = await fetch(`/api/logistics/vehicles/${v.id}/documents/${id}`, { method: "DELETE" });
    if (r.ok) loadDocs();
  }

  const prof = v.logisticsProfile ?? { trailerReg: null, carrierId: null, defaultDriver: null, ownershipType: "unspecified" };
  const inp = { padding: "6px 9px", fontSize: 13, width: "100%" } as const;
  const lbl = { fontSize: 11.5, color: "var(--muted)", display: "block", marginBottom: 3 } as const;
  const dt = (s: string | null) => s ? new Date(s).toLocaleDateString() : "—";

  return (
    <div style={{ maxWidth: 820 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        <Link href="/dashboard/logistics/vehicles" style={{ color: "var(--muted)", textDecoration: "none", fontSize: 13 }}>← {t("logistics.vehicles.title")}</Link>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 600, margin: 0 }}>{v.registration}</h1>
        <span style={{ fontSize: 11.5, fontWeight: 700, color: "#fff", background: v.active ? "var(--emerald)" : "var(--muted)", borderRadius: 12, padding: "2px 10px" }}>{v.active ? t("logistics.common.active") : t("logistics.common.inactive")}</span>
      </div>
      {err && <div style={{ color: "var(--brick)", fontSize: 12.5, marginBottom: 10 }}>{err}</div>}
      {v.aliases.length > 0 && <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 10 }}>{t("logistics.products.aliases")}: {v.aliases.map((a) => a.alias).join(", ")}</div>}

      {/* Основни данни */}
      <div className="glass panel" style={{ marginBottom: 14 }}>
        <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 15, margin: "0 0 12px" }}>{t("logistics.dossier.basic")}</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12 }}>
          <div><label style={lbl}>{t("logistics.vehicles.trailer")}</label>
            <input style={inp} disabled={!canManage} defaultValue={prof.trailerReg ?? ""} onBlur={(e) => save({ trailerReg: e.target.value || null })} /></div>
          <div><label style={lbl}>{t("logistics.vehicles.carrier")}</label>
            <SearchableSelect options={carriers.map((c) => ({ value: c.id, label: c.name }))} value={prof.carrierId ?? ""} onChange={(val) => canManage && save({ carrierId: val || null })} emptyLabel="—" /></div>
          <div><label style={lbl}>{t("logistics.vehicles.driver")}</label>
            <input style={inp} disabled={!canManage} defaultValue={prof.defaultDriver ?? ""} onBlur={(e) => save({ defaultDriver: e.target.value || null })} /></div>
          <div><label style={lbl}>{t("logistics.vehicles.ownership")}</label>
            <select style={inp} disabled={!canManage} value={prof.ownershipType ?? "unspecified"} onChange={(e) => save({ ownershipType: e.target.value })}>
              {OWNERSHIP.map((o) => <option key={o} value={o}>{t(`logistics.vehicles.own_${o}`)}</option>)}
            </select></div>
          <div style={{ gridColumn: "1 / -1" }}><label style={lbl}>{t("logistics.common.notes")}</label>
            <textarea style={{ ...inp, minHeight: 44 }} disabled={!canManage} defaultValue={v.notes ?? ""} onBlur={(e) => save({ notes: e.target.value || null })} /></div>
        </div>
      </div>

      {/* Документи */}
      <div className="glass panel" style={{ marginBottom: 14 }}>
        <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 15, margin: "0 0 10px" }}>{t("logistics.dossier.documents")}</h3>
        {canDocs && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "end", marginBottom: 12 }}>
            <div><label style={lbl}>{t("logistics.dossier.docType")}</label>
              <select style={{ ...inp, width: 170 }} value={docForm.docType} onChange={(e) => setDocForm({ ...docForm, docType: e.target.value })}>
                {DOC_TYPES.map((d) => <option key={d} value={d}>{t(`logistics.docTypes.${d}`)}</option>)}
              </select></div>
            <div><label style={lbl}>{t("logistics.dossier.docName")}</label><input style={{ ...inp, width: 150 }} value={docForm.name} onChange={(e) => setDocForm({ ...docForm, name: e.target.value })} /></div>
            <div><label style={lbl}>{t("logistics.dossier.docNumber")}</label><input style={{ ...inp, width: 110 }} value={docForm.number} onChange={(e) => setDocForm({ ...docForm, number: e.target.value })} /></div>
            <div><label style={lbl}>{t("logistics.dossier.validTo")}</label><input type="date" style={{ ...inp, width: 140 }} value={docForm.validTo} onChange={(e) => setDocForm({ ...docForm, validTo: e.target.value })} /></div>
            <div><label style={lbl}>{t("logistics.dossier.file")}</label><input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png,image/*,application/pdf" style={{ fontSize: 12 }} /></div>
            <button className="btn btn-primary btn-sm" disabled={busy} onClick={uploadDoc}>{t("logistics.dossier.addDoc")}</button>
          </div>
        )}
        {docs.length === 0 ? <div style={{ fontSize: 13, color: "var(--muted)" }}>{t("logistics.dossier.noDocs")}</div> : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
            <thead><tr style={{ textAlign: "left", color: "var(--muted)" }}>
              <th style={{ padding: "6px 8px" }}>{t("logistics.dossier.docType")}</th><th style={{ padding: "6px 8px" }}>{t("logistics.dossier.docName")}</th>
              <th style={{ padding: "6px 8px" }}>{t("logistics.dossier.docNumber")}</th><th style={{ padding: "6px 8px" }}>{t("logistics.dossier.validTo")}</th>
              <th style={{ padding: "6px 8px", textAlign: "right" }}>{t("logistics.common.actions")}</th>
            </tr></thead>
            <tbody>
              {docs.map((d) => (
                <tr key={d.id} style={{ borderTop: "1px solid rgba(217,215,200,.5)" }}>
                  <td style={{ padding: "6px 8px" }}>{t(`logistics.docTypes.${d.docType ?? "other"}`)}</td>
                  <td style={{ padding: "6px 8px" }}>{d.name ?? d.originalFilename ?? "—"}</td>
                  <td style={{ padding: "6px 8px" }}>{d.number ?? "—"}</td>
                  <td style={{ padding: "6px 8px" }}>{dt(d.validTo)}</td>
                  <td style={{ padding: "6px 8px", textAlign: "right", whiteSpace: "nowrap" }}>
                    <a className="btn btn-ghost btn-sm" href={`/api/logistics/vehicles/${v.id}/documents/${d.id}/file`} target="_blank" rel="noreferrer">{t("logistics.dossier.download")}</a>{" "}
                    {canDocs && <button className="btn btn-ghost btn-sm" style={{ color: "var(--brick)" }} onClick={() => delDoc(d.id)}>{t("logistics.common.delete")}</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* История */}
      <div className="glass panel">
        <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 15, margin: "0 0 8px" }}>{t("logistics.dossier.history")}</h3>
        {!history || history.trips === 0 ? (
          <div style={{ fontSize: 13, color: "var(--muted)" }}>{t("logistics.dossier.historyPlaceholder")}</div>
        ) : (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: 10, marginBottom: 8 }}>
              <div className="glass kpi-card"><div style={{ fontSize: 11.5, color: "var(--muted)" }}>{t("logistics.vhist.trips")}</div><div className="num" style={{ fontSize: 18, fontWeight: 600 }}>{history.trips}</div></div>
              <div className="glass kpi-card"><div style={{ fontSize: 11.5, color: "var(--muted)" }}>{t("logistics.vhist.tons")}</div><div className="num" style={{ fontSize: 18, fontWeight: 600 }}>{history.totalTons} t</div></div>
              <div className="glass kpi-card"><div style={{ fontSize: 11.5, color: "var(--muted)" }}>{t("logistics.vhist.lastTrip")}</div><div className="num" style={{ fontSize: 14, fontWeight: 600 }}>{history.lastTrip ? new Date(history.lastTrip).toLocaleDateString() : "—"}</div></div>
              <div className="glass kpi-card"><div style={{ fontSize: 11.5, color: "var(--muted)" }}>{t("logistics.vhist.firstTrip")}</div><div className="num" style={{ fontSize: 14, fontWeight: 600 }}>{history.firstTrip ? new Date(history.firstTrip).toLocaleDateString() : "—"}</div></div>
            </div>
            {history.products.length > 0 && <div style={{ fontSize: 12, color: "var(--muted)" }}>{t("logistics.vhist.products")}: {history.products.join(", ")}</div>}
            {history.destinations.length > 0 && <div style={{ fontSize: 12, color: "var(--muted)" }}>{t("logistics.vhist.destinations")}: {history.destinations.join(", ")}</div>}
          </>
        )}
      </div>
    </div>
  );
}
