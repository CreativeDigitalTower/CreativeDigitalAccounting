"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useT } from "@/components/i18n/I18nProvider";
import { ATTACHMENT_CATEGORIES } from "@/lib/logistics/attachmentCategories";
import { confirmDelete } from "@/lib/confirmDelete";

type Att = { id: string; category: string; name: string; originalFilename: string; mimeType: string; size: number; documentNumber: string | null; documentDate: string | null; notes: string | null; createdAt: string };
type Ev = { id: string; action: string; entity: string; summary: string | null; at: string; actor: string | null };

const KB = (n: number) => n < 1024 * 1024 ? `${Math.round(n / 1024)} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`;

export function ExportDossierExtras({ id, canManage, truckVehicleId, mkInvoice, receivedBy }: {
  id: string; canManage: boolean; truckVehicleId?: string | null; mkInvoice?: { id: string; number: string } | null; receivedBy?: string | null;
}) {
  const t = useT();
  const [atts, setAtts] = useState<Att[]>([]);
  const [events, setEvents] = useState<Ev[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [edit, setEdit] = useState<Att | null>(null);
  const catLabel = (c: string) => t(`logistics.dossier.cat_${c}`);

  function loadAtts() { fetch(`/api/logistics/export-sets/${id}/attachments`).then((r) => r.ok ? r.json() : []).then(setAtts); }
  function loadTimeline() { fetch(`/api/logistics/export-sets/${id}/timeline`).then((r) => r.ok ? r.json() : []).then(setEvents); }
  useEffect(() => { loadAtts(); loadTimeline(); }, [id]);

  async function del(att: Att) {
    if (!(await confirmDelete(att.name))) return;
    const r = await fetch(`/api/logistics/export-sets/${id}/attachments/${att.id}`, { method: "DELETE" });
    if (r.ok) { loadAtts(); loadTimeline(); }
  }

  const th = { textAlign: "left" as const, padding: "6px 8px", color: "var(--muted)", fontSize: 11.5 };
  const td = { padding: "6px 8px", fontSize: 12.5, borderTop: "1px solid rgba(217,215,200,.5)", verticalAlign: "top" as const };
  const dt = (x: string | null) => x ? new Date(x).toLocaleDateString() : "—";
  const dtm = (x: string) => new Date(x).toLocaleString();

  return (
    <>
      {/* ── Допълнителни документи (§7) ── */}
      <div className="glass panel" style={{ marginTop: 14 }}>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 8 }}>
          <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 15, margin: 0 }}>{t("logistics.dossier.additional")}</h3>
          {canManage && <button className="btn btn-primary btn-sm" style={{ marginLeft: "auto" }} onClick={() => setShowAdd(true)}>+ {t("logistics.dossier.addDoc")}</button>}
        </div>
        {atts.length === 0 ? <div style={{ fontSize: 12.5, color: "var(--muted)" }}>{t("logistics.dossier.emptyDocs")}</div> : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr>
                <th style={th}>{t("logistics.dossier.category")}</th><th style={th}>{t("logistics.dossier.name")}</th>
                <th style={th}>{t("logistics.dossier.docNumber")}</th><th style={th}>{t("logistics.dossier.docDate")}</th>
                <th style={th}>{t("logistics.dossier.size")}</th><th style={th} />
              </tr></thead>
              <tbody>
                {atts.map((a) => (
                  <tr key={a.id}>
                    <td style={td}><span style={{ fontSize: 11, background: "rgba(178,120,42,.14)", borderRadius: 8, padding: "1px 7px" }}>{catLabel(a.category)}</span></td>
                    <td style={td}>{a.name}{a.notes ? <div style={{ fontSize: 11, color: "var(--muted)" }}>{a.notes}</div> : null}</td>
                    <td style={td}>{a.documentNumber ?? "—"}</td>
                    <td style={td}>{dt(a.documentDate)}</td>
                    <td style={td} className="num">{KB(a.size)}</td>
                    <td style={{ ...td, whiteSpace: "nowrap" }}>
                      <a className="btn btn-ghost btn-sm" style={{ fontSize: 11, padding: "2px 8px" }} href={`/api/logistics/export-sets/${id}/attachments/${a.id}`} target="_blank" rel="noreferrer">{t("logistics.dossier.download")}</a>
                      {canManage && <> <button className="btn btn-ghost btn-sm" style={{ fontSize: 11, padding: "2px 8px" }} onClick={() => setEdit(a)}>{t("logistics.common.edit")}</button>
                      <button className="btn btn-ghost btn-sm" style={{ fontSize: 11, padding: "2px 8px", color: "var(--brick)" }} onClick={() => del(a)}>{t("logistics.common.delete")}</button></>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Свързани записи (§53) ── */}
      <div className="glass panel" style={{ marginTop: 14 }}>
        <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 15, margin: "0 0 8px" }}>{t("logistics.dossier.related")}</h3>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 16, fontSize: 12.5 }}>
          {truckVehicleId && <div><span style={{ color: "var(--muted)" }}>{t("logistics.dossier.vehicle")}: </span><Link href={`/dashboard/logistics/vehicles/${truckVehicleId}`} style={{ fontWeight: 600 }}>{t("logistics.dossier.openVehicle")} →</Link></div>}
          <div><span style={{ color: "var(--muted)" }}>{t("logistics.received.mkInvoice")}: </span>{mkInvoice ? <Link href={`/dashboard/logistics/mk-sales/${mkInvoice.id}`} style={{ fontWeight: 600 }}>{mkInvoice.number} →</Link> : "—"}</div>
          <div><span style={{ color: "var(--muted)" }}>SEM: </span>{receivedBy ?? t("logistics.dossier.notReceived")}</div>
        </div>
      </div>

      {/* ── Хронология (§20) ── */}
      <div className="glass panel" style={{ marginTop: 14 }}>
        <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 15, margin: "0 0 8px" }}>{t("logistics.dossier.timeline")}</h3>
        {events.length === 0 ? <div style={{ fontSize: 12.5, color: "var(--muted)" }}>—</div> : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {events.map((e) => (
              <div key={e.id} style={{ display: "flex", gap: 10, fontSize: 12.5, borderLeft: "2px solid var(--brass)", paddingLeft: 10 }}>
                <span style={{ color: "var(--muted)", minWidth: 130 }}>{dtm(e.at)}</span>
                <span>{e.summary ?? e.action}{e.actor ? <span style={{ color: "var(--muted)" }}> · {e.actor}</span> : null}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {showAdd && <AttachModal id={id} onClose={() => setShowAdd(false)} onDone={() => { setShowAdd(false); loadAtts(); loadTimeline(); }} />}
      {edit && <EditMetaModal id={id} att={edit} onClose={() => setEdit(null)} onDone={() => { setEdit(null); loadAtts(); }} />}
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label style={{ fontSize: 11.5, color: "var(--muted)", display: "block", marginBottom: 3 }}>{label}</label>{children}</div>;
}

function AttachModal({ id, onClose, onDone }: { id: string; onClose: () => void; onDone: () => void }) {
  const t = useT();
  const [category, setCategory] = useState("customs");
  const [name, setName] = useState("");
  const [docNumber, setDocNumber] = useState("");
  const [docDate, setDocDate] = useState("");
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const inp = { width: "100%", padding: "6px 9px", fontSize: 13 } as const;

  async function submit() {
    setErr("");
    if (!file) { setErr(t("logistics.dossier.errFile")); return; }
    setBusy(true);
    const fd = new FormData();
    fd.set("file", file); fd.set("category", category); if (name) fd.set("name", name);
    if (docNumber) fd.set("documentNumber", docNumber);
    if (docDate) fd.set("documentDate", new Date(docDate).toISOString());
    if (notes) fd.set("notes", notes);
    const r = await fetch(`/api/logistics/export-sets/${id}/attachments`, { method: "POST", body: fd });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) { setErr(j.error ?? t("logistics.common.err")); return; }
    onDone();
  }

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.4)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div className="glass panel" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 460, width: "100%", padding: 20 }}>
        <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 18, margin: "0 0 14px" }}>{t("logistics.dossier.addDoc")}</h2>
        <div style={{ display: "grid", gap: 10 }}>
          <Field label={t("logistics.dossier.category")}>
            <select style={inp} value={category} onChange={(e) => setCategory(e.target.value)}>
              {ATTACHMENT_CATEGORIES.map((c) => <option key={c} value={c}>{t(`logistics.dossier.cat_${c}`)}</option>)}
            </select>
          </Field>
          <Field label={t("logistics.dossier.name")}><input style={inp} value={name} onChange={(e) => setName(e.target.value)} placeholder={t("logistics.dossier.nameHint")} /></Field>
          <Field label={t("logistics.dossier.file")}><input type="file" accept=".pdf,.jpg,.jpeg,.png,.xls,.xlsx,.doc,.docx" onChange={(e) => setFile(e.target.files?.[0] ?? null)} /></Field>
          <div style={{ display: "flex", gap: 10 }}>
            <div style={{ flex: 1 }}><Field label={t("logistics.dossier.docNumber")}><input style={inp} value={docNumber} onChange={(e) => setDocNumber(e.target.value)} /></Field></div>
            <div style={{ flex: 1 }}><Field label={t("logistics.dossier.docDate")}><input type="date" style={inp} value={docDate} onChange={(e) => setDocDate(e.target.value)} /></Field></div>
          </div>
          <Field label={t("logistics.dossier.notes")}><input style={inp} value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
        </div>
        {err && <div style={{ color: "var(--brick)", fontSize: 12.5, marginTop: 10 }}>{err}</div>}
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
          <button className="btn btn-ghost btn-sm" onClick={onClose} disabled={busy}>{t("logistics.common.cancel")}</button>
          <button className="btn btn-primary btn-sm" onClick={submit} disabled={busy}>{t("logistics.dossier.upload")}</button>
        </div>
      </div>
    </div>
  );
}

function EditMetaModal({ id, att, onClose, onDone }: { id: string; att: Att; onClose: () => void; onDone: () => void }) {
  const t = useT();
  const [category, setCategory] = useState(att.category);
  const [name, setName] = useState(att.name);
  const [docNumber, setDocNumber] = useState(att.documentNumber ?? "");
  const [docDate, setDocDate] = useState(att.documentDate ? att.documentDate.slice(0, 10) : "");
  const [notes, setNotes] = useState(att.notes ?? "");
  const [busy, setBusy] = useState(false);
  const inp = { width: "100%", padding: "6px 9px", fontSize: 13 } as const;

  async function save() {
    setBusy(true);
    const r = await fetch(`/api/logistics/export-sets/${id}/attachments/${att.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category, name, documentNumber: docNumber || null, documentDate: docDate ? new Date(docDate).toISOString() : null, notes: notes || null }),
    });
    setBusy(false);
    if (r.ok) onDone();
  }

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.4)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div className="glass panel" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 460, width: "100%", padding: 20 }}>
        <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 18, margin: "0 0 14px" }}>{t("logistics.common.edit")}</h2>
        <div style={{ display: "grid", gap: 10 }}>
          <Field label={t("logistics.dossier.category")}>
            <select style={inp} value={category} onChange={(e) => setCategory(e.target.value)}>
              {ATTACHMENT_CATEGORIES.map((c) => <option key={c} value={c}>{t(`logistics.dossier.cat_${c}`)}</option>)}
            </select>
          </Field>
          <Field label={t("logistics.dossier.name")}><input style={inp} value={name} onChange={(e) => setName(e.target.value)} /></Field>
          <div style={{ display: "flex", gap: 10 }}>
            <div style={{ flex: 1 }}><Field label={t("logistics.dossier.docNumber")}><input style={inp} value={docNumber} onChange={(e) => setDocNumber(e.target.value)} /></Field></div>
            <div style={{ flex: 1 }}><Field label={t("logistics.dossier.docDate")}><input type="date" style={inp} value={docDate} onChange={(e) => setDocDate(e.target.value)} /></Field></div>
          </div>
          <Field label={t("logistics.dossier.notes")}><input style={inp} value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
          <button className="btn btn-ghost btn-sm" onClick={onClose} disabled={busy}>{t("logistics.common.cancel")}</button>
          <button className="btn btn-primary btn-sm" onClick={save} disabled={busy}>{t("logistics.export.saveChanges")}</button>
        </div>
      </div>
    </div>
  );
}
