"use client";
import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/components/i18n/I18nProvider";
import { confirmDelete } from "@/lib/confirmDelete";
import {
  ASSET_DOC_TYPES, REMINDER_DAY_OPTIONS, normalizeDocType,
  validityStatus, daysUntil, type AssetDocCaps,
} from "@/lib/assetDocuments";

export type AssetDocDto = {
  id: string; docType: string | null; name: string | null; description: string | null;
  docDate: string | null; number: string | null; issuer: string | null;
  validFrom: string | null; validTo: string | null; note: string | null;
  data: Record<string, unknown> | null;
  reminderDays: number | null; reminderSentAt: string | null;
  filename: string | null; originalFilename: string | null; mimeType: string | null; size: number | null;
  linkedDocumentId: string | null;
  linkedDocument?: { id: string; number: string; type: string } | null;
  uploadedById: string | null; createdAt: string; updatedAt: string;
};
export type LinkableDoc = { id: string; number: string; type: string };

const fileToDataUrl = (file: File) =>
  new Promise<string>((res, rej) => { const fr = new FileReader(); fr.onload = () => res(String(fr.result)); fr.onerror = rej; fr.readAsDataURL(file); });

// Реални ограничения на платформата (fileSecurity): PDF, изображения и .doc.
// .docx се отхвърля от общия филтър (MIME съдържа „xml") → не го предлагаме.
const ACCEPT = ".pdf,.jpg,.jpeg,.png,.doc,image/*,application/pdf,application/msword";

export function AssetDocuments({ assetId, docs: initial, linkable, caps }: {
  assetId: string; docs: AssetDocDto[]; linkable: LinkableDoc[]; caps: AssetDocCaps;
}) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const [docs, setDocs] = useState<AssetDocDto[]>(initial);
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"upload" | "link">("upload");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [preview, setPreview] = useState<AssetDocDto | null>(null);
  const [editing, setEditing] = useState<AssetDocDto | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const replaceRef = useRef<HTMLInputElement>(null);

  // Form state
  const emptyForm = {
    docType: "other", name: "", number: "", issuer: "", docDate: "", validFrom: "", validTo: "",
    note: "", description: "", reminderDays: "" as string,
    // warranty/insurance/invoice/receipt extras (в data)
    provider: "", contact: "", policyNo: "", insuredValue: "", supplier: "", invoiceNo: "",
    amount: "", vat: "", currency: "EUR", merchant: "",
  };
  const [form, setForm] = useState({ ...emptyForm });
  const [linkId, setLinkId] = useState("");

  const dt = (v: string | null) => v ? new Date(v).toLocaleDateString(locale) : "—";
  const typeLabel = (v: string | null) => t(`assets.docs.types.${normalizeDocType(v)}`);
  const isWarranty = form.docType === "warranty";
  const isInsurance = form.docType === "insurance";
  const isInvoice = form.docType === "invoice";
  const isReceipt = form.docType === "receipt";

  function buildData(f: typeof form): Record<string, unknown> | null {
    const o: Record<string, unknown> = {};
    if (f.docType === "warranty") { if (f.provider) o.provider = f.provider; if (f.contact) o.contact = f.contact; }
    if (f.docType === "insurance") { if (f.provider) o.insurer = f.provider; if (f.policyNo) o.policyNo = f.policyNo; if (f.insuredValue) o.insuredValue = f.insuredValue; }
    if (f.docType === "invoice") { if (f.supplier) o.supplier = f.supplier; if (f.invoiceNo) o.invoiceNo = f.invoiceNo; if (f.amount) o.amount = f.amount; if (f.vat) o.vat = f.vat; if (f.currency) o.currency = f.currency; }
    if (f.docType === "receipt") { if (f.merchant) o.merchant = f.merchant; if (f.amount) o.amount = f.amount; }
    return Object.keys(o).length ? o : null;
  }

  const statusChip = (d: AssetDocDto) => {
    if (!d.validTo) return null;
    const s = validityStatus(d.validTo);
    const days = daysUntil(d.validTo) ?? 0;
    const map: Record<string, { c: string; label: string }> = {
      active: { c: "var(--emerald)", label: t("assets.docs.status.active") },
      expiring: { c: "var(--brass)", label: t("assets.docs.status.expiring", { n: days }) },
      expired: { c: "var(--brick)", label: t("assets.docs.status.expired") },
      none: { c: "var(--muted)", label: "—" },
    };
    const m = map[s];
    return <span style={{ fontSize: 11, fontWeight: 700, color: "#fff", background: m.c, borderRadius: 12, padding: "2px 9px" }}>{m.label}</span>;
  };

  async function submit() {
    setErr(""); setBusy(true);
    try {
      const body: Record<string, unknown> = {
        docType: form.docType,
        name: form.name || null, number: form.number || null, issuer: form.issuer || null,
        docDate: form.docDate ? new Date(form.docDate).toISOString() : null,
        validFrom: form.validFrom ? new Date(form.validFrom).toISOString() : null,
        validTo: form.validTo ? new Date(form.validTo).toISOString() : null,
        note: form.note || null, description: form.description || null,
        reminderDays: form.reminderDays ? Number(form.reminderDays) : null,
        data: buildData(form),
      };
      if (mode === "upload") {
        const file = fileRef.current?.files?.[0];
        if (!file) { setErr(t("assets.docs.errNoFile")); setBusy(false); return; }
        body.dataUrl = await fileToDataUrl(file);
        body.originalFilename = file.name;
        body.mimeType = file.type || "application/octet-stream";
        body.size = file.size;
      } else {
        if (!linkId) { setErr(t("assets.docs.errNoLink")); setBusy(false); return; }
        body.linkedDocumentId = linkId;
      }
      const res = await fetch(`/api/assets/${assetId}/documents`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) { setErr(j.error ?? t("assets.docs.errSave")); setBusy(false); return; }
      setDocs([{ ...j, linkedDocument: linkable.find((l) => l.id === linkId) ?? null }, ...docs]);
      setForm({ ...emptyForm }); setLinkId(""); if (fileRef.current) fileRef.current.value = ""; setOpen(false);
      router.refresh();
    } catch { setErr(t("assets.docs.errSave")); }
    setBusy(false);
  }

  async function saveEdit() {
    if (!editing) return;
    setBusy(true); setErr("");
    const body = {
      docType: editing.docType, name: editing.name, number: editing.number, issuer: editing.issuer,
      docDate: editing.docDate ? new Date(editing.docDate).toISOString() : null,
      validFrom: editing.validFrom ? new Date(editing.validFrom).toISOString() : null,
      validTo: editing.validTo ? new Date(editing.validTo).toISOString() : null,
      note: editing.note, description: editing.description,
      reminderDays: editing.reminderDays,
    };
    const res = await fetch(`/api/assets/${assetId}/documents/${editing.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setErr(j.error ?? t("assets.docs.errSave")); return; }
    setDocs(docs.map((d) => d.id === j.id ? { ...d, ...j } : d));
    setEditing(null); router.refresh();
  }

  async function replaceFile(d: AssetDocDto, file: File) {
    // Изрично потвърждение преди замяна, за да не стане грешка в бързината.
    if (!window.confirm(t("assets.docs.confirmReplace", { name: d.originalFilename ?? d.name ?? "" }))) return;
    setBusy(true); setErr("");
    const dataUrl = await fileToDataUrl(file);
    const res = await fetch(`/api/assets/${assetId}/documents/${d.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ replaceFile: { originalFilename: file.name, mimeType: file.type || "application/octet-stream", size: file.size, dataUrl } }),
    });
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setErr(j.error ?? t("assets.docs.errSave")); return; }
    setDocs(docs.map((x) => x.id === j.id ? { ...x, ...j } : x));
    router.refresh();
  }

  async function remove(d: AssetDocDto) {
    if (!(await confirmDelete(t("assets.docs.confirmDeleteName", { name: d.name ?? d.originalFilename ?? typeLabel(d.docType) })))) return;
    setBusy(true);
    const res = await fetch(`/api/assets/${assetId}/documents/${d.id}`, { method: "DELETE" });
    setBusy(false);
    if (res.ok) { setDocs(docs.filter((x) => x.id !== d.id)); router.refresh(); }
    else setErr(t("assets.docs.errDelete"));
  }

  const canPreview = (d: AssetDocDto) => {
    const m = (d.mimeType ?? "").toLowerCase();
    return !d.linkedDocumentId && (m === "application/pdf" || m.startsWith("image/"));
  };
  const fileUrl = (d: AssetDocDto, inline = false) => `/api/assets/${assetId}/documents/${d.id}/file${inline ? "?inline=1" : ""}`;

  const linkOptions = useMemo(() => linkable, [linkable]);
  const inp = { padding: "6px 9px", fontSize: 13, width: "100%" } as const;
  const lbl = { fontSize: 11.5, color: "var(--muted)", display: "block", marginBottom: 3 } as const;

  return (
    <div className="glass panel" style={{ marginTop: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, flexWrap: "wrap" }}>
        <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 15, margin: 0 }}>{t("assets.docs.title")} ({docs.length})</h3>
        {caps.canUpload && (
          <button className="btn btn-primary btn-sm" style={{ marginLeft: "auto" }} onClick={() => setOpen(!open)}>
            {open ? t("assets.docs.closeForm") : t("assets.docs.addBtn")}
          </button>
        )}
      </div>

      {err && <div style={{ color: "var(--brick)", fontSize: 12.5, marginBottom: 8 }}>{err}</div>}

      {open && caps.canUpload && (
        <div style={{ border: "1px solid rgba(217,215,200,.6)", borderRadius: 10, padding: 14, marginBottom: 14 }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
            <button className={`btn btn-sm ${mode === "upload" ? "btn-primary" : "btn-ghost"}`} onClick={() => setMode("upload")}>{t("assets.docs.tabUpload")}</button>
            <button className={`btn btn-sm ${mode === "link" ? "btn-primary" : "btn-ghost"}`} onClick={() => setMode("link")} disabled={linkOptions.length === 0}>{t("assets.docs.tabLink")}</button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 10 }}>
            <div><label style={lbl}>{t("assets.docs.f.type")}</label>
              <select style={inp} value={form.docType} onChange={(e) => setForm({ ...form, docType: e.target.value })}>
                {ASSET_DOC_TYPES.map((tp) => <option key={tp} value={tp}>{t(`assets.docs.types.${tp}`)}</option>)}
              </select>
            </div>
            {mode === "upload" ? (
              <div><label style={lbl}>{t("assets.docs.f.file")}</label>
                <input ref={fileRef} type="file" accept={ACCEPT} style={{ ...inp, padding: "4px" }} />
              </div>
            ) : (
              <div><label style={lbl}>{t("assets.docs.f.linkDoc")}</label>
                <select style={inp} value={linkId} onChange={(e) => setLinkId(e.target.value)}>
                  <option value="">{t("assets.docs.f.selectDoc")}</option>
                  {linkOptions.map((l) => <option key={l.id} value={l.id}>{l.number} · {l.type}</option>)}
                </select>
              </div>
            )}
            <div><label style={lbl}>{t("assets.docs.f.name")}</label><input style={inp} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><label style={lbl}>{t("assets.docs.f.number")}</label><input style={inp} value={form.number} onChange={(e) => setForm({ ...form, number: e.target.value })} /></div>
            <div><label style={lbl}>{t("assets.docs.f.issuer")}</label><input style={inp} value={form.issuer} onChange={(e) => setForm({ ...form, issuer: e.target.value })} /></div>
            <div><label style={lbl}>{t("assets.docs.f.docDate")}</label><input type="date" style={inp} value={form.docDate} onChange={(e) => setForm({ ...form, docDate: e.target.value })} /></div>
            <div><label style={lbl}>{t("assets.docs.f.validFrom")}</label><input type="date" style={inp} value={form.validFrom} onChange={(e) => setForm({ ...form, validFrom: e.target.value })} /></div>
            <div><label style={lbl}>{t("assets.docs.f.validTo")}</label><input type="date" style={inp} value={form.validTo} onChange={(e) => setForm({ ...form, validTo: e.target.value })} /></div>

            {(isWarranty || isInsurance) && (
              <div><label style={lbl}>{isInsurance ? t("assets.docs.f.insurer") : t("assets.docs.f.provider")}</label><input style={inp} value={form.provider} onChange={(e) => setForm({ ...form, provider: e.target.value })} /></div>
            )}
            {isWarranty && <div><label style={lbl}>{t("assets.docs.f.contact")}</label><input style={inp} value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} /></div>}
            {isInsurance && <>
              <div><label style={lbl}>{t("assets.docs.f.policyNo")}</label><input style={inp} value={form.policyNo} onChange={(e) => setForm({ ...form, policyNo: e.target.value })} /></div>
              <div><label style={lbl}>{t("assets.docs.f.insuredValue")}</label><input style={inp} value={form.insuredValue} onChange={(e) => setForm({ ...form, insuredValue: e.target.value })} /></div>
            </>}
            {isInvoice && <>
              <div><label style={lbl}>{t("assets.docs.f.supplier")}</label><input style={inp} value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })} /></div>
              <div><label style={lbl}>{t("assets.docs.f.amount")}</label><input style={inp} value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></div>
              <div><label style={lbl}>{t("assets.docs.f.vat")}</label><input style={inp} value={form.vat} onChange={(e) => setForm({ ...form, vat: e.target.value })} /></div>
            </>}
            {isReceipt && <>
              <div><label style={lbl}>{t("assets.docs.f.merchant")}</label><input style={inp} value={form.merchant} onChange={(e) => setForm({ ...form, merchant: e.target.value })} /></div>
              <div><label style={lbl}>{t("assets.docs.f.amount")}</label><input style={inp} value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></div>
            </>}

            {form.validTo && (
              <div><label style={lbl}>{t("assets.docs.f.reminder")}</label>
                <select style={inp} value={form.reminderDays} onChange={(e) => setForm({ ...form, reminderDays: e.target.value })}>
                  <option value="">{t("assets.docs.f.noReminder")}</option>
                  {REMINDER_DAY_OPTIONS.map((d) => <option key={d} value={d}>{t("assets.docs.f.reminderDays", { n: d })}</option>)}
                </select>
              </div>
            )}
          </div>
          <div style={{ marginTop: 8 }}><label style={lbl}>{t("assets.docs.f.note")}</label><textarea style={{ ...inp, minHeight: 44 }} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></div>
          <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
            <button className="btn btn-primary btn-sm" disabled={busy} onClick={submit}>{busy ? t("assets.docs.saving") : t("assets.docs.save")}</button>
            <button className="btn btn-ghost btn-sm" onClick={() => { setOpen(false); setErr(""); }}>{t("assets.docs.cancel")}</button>
          </div>
        </div>
      )}

      {docs.length === 0 ? (
        <div style={{ fontSize: 13, color: "var(--muted)" }}>{t("assets.docs.empty")}</div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
            <thead><tr style={{ textAlign: "left", color: "var(--muted)" }}>
              <th style={{ padding: "6px 8px" }}>{t("assets.docs.th.type")}</th>
              <th style={{ padding: "6px 8px" }}>{t("assets.docs.th.name")}</th>
              <th style={{ padding: "6px 8px" }}>{t("assets.docs.th.date")}</th>
              <th style={{ padding: "6px 8px" }}>{t("assets.docs.th.validity")}</th>
              <th style={{ padding: "6px 8px" }}>{t("assets.docs.th.status")}</th>
              <th style={{ padding: "6px 8px", textAlign: "right" }}>{t("assets.docs.th.actions")}</th>
            </tr></thead>
            <tbody>
              {docs.map((d) => (
                <tr key={d.id} style={{ borderTop: "1px solid rgba(217,215,200,.5)" }}>
                  <td style={{ padding: "6px 8px" }}>{typeLabel(d.docType)}</td>
                  <td style={{ padding: "6px 8px" }}>
                    {d.name ?? d.originalFilename ?? (d.linkedDocument ? `${t("assets.docs.linkedTag")}: ${d.linkedDocument.number}` : "—")}
                    {d.linkedDocumentId && <span style={{ fontSize: 10, marginLeft: 6, color: "var(--navy)", border: "1px solid var(--navy)", borderRadius: 8, padding: "1px 5px" }}>{t("assets.docs.linkedTag")}</span>}
                  </td>
                  <td style={{ padding: "6px 8px" }}>{dt(d.docDate)}</td>
                  <td style={{ padding: "6px 8px" }}>{d.validTo ? `${dt(d.validFrom)} → ${dt(d.validTo)}` : "—"}</td>
                  <td style={{ padding: "6px 8px" }}>{statusChip(d) ?? "—"}</td>
                  <td style={{ padding: "6px 8px", textAlign: "right", whiteSpace: "nowrap" }}>
                    {canPreview(d) && <button className="btn btn-ghost btn-sm" onClick={() => setPreview(d)}>{t("assets.docs.act.preview")}</button>}{" "}
                    <a className="btn btn-ghost btn-sm" href={fileUrl(d)} target="_blank" rel="noreferrer">{t("assets.docs.act.download")}</a>{" "}
                    {caps.canEdit && <button className="btn btn-ghost btn-sm" onClick={() => setEditing({ ...d })}>{t("assets.docs.act.edit")}</button>}{" "}
                    {caps.canEdit && !d.linkedDocumentId && <>
                      <button className="btn btn-ghost btn-sm" onClick={() => replaceRef.current?.click()}>{t("assets.docs.act.replace")}</button>
                      <input ref={replaceRef} type="file" accept={ACCEPT} style={{ display: "none" }} onChange={(e) => { const f = e.target.files?.[0]; if (f) replaceFile(d, f); e.target.value = ""; }} />
                    </>}{" "}
                    {caps.canDelete && <button className="btn btn-ghost btn-sm" style={{ color: "var(--brick)" }} onClick={() => remove(d)}>{t("assets.docs.act.delete")}</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {preview && (
        <div onClick={() => setPreview(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.6)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "var(--paper,#fff)", borderRadius: 12, padding: 12, maxWidth: "90vw", maxHeight: "90vh", width: 800, display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", alignItems: "center", marginBottom: 8 }}>
              <strong style={{ fontSize: 13 }}>{preview.name ?? preview.originalFilename}</strong>
              <button className="btn btn-ghost btn-sm" style={{ marginLeft: "auto" }} onClick={() => setPreview(null)}>✕</button>
            </div>
            {(preview.mimeType ?? "").startsWith("image/")
              ? <img src={fileUrl(preview, true)} alt="" style={{ maxWidth: "100%", maxHeight: "78vh", objectFit: "contain" }} />
              : <iframe src={fileUrl(preview, true)} style={{ width: "100%", height: "78vh", border: "none" }} />}
          </div>
        </div>
      )}

      {editing && (
        <div onClick={() => setEditing(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.6)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div onClick={(e) => e.stopPropagation()} className="glass panel" style={{ maxWidth: 560, width: "100%", maxHeight: "90vh", overflowY: "auto" }}>
            <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 15, marginTop: 0 }}>{t("assets.docs.editTitle")}</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div><label style={lbl}>{t("assets.docs.f.type")}</label>
                <select style={inp} value={editing.docType ?? "other"} onChange={(e) => setEditing({ ...editing, docType: e.target.value })}>
                  {ASSET_DOC_TYPES.map((tp) => <option key={tp} value={tp}>{t(`assets.docs.types.${tp}`)}</option>)}
                </select></div>
              <div><label style={lbl}>{t("assets.docs.f.name")}</label><input style={inp} value={editing.name ?? ""} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></div>
              <div><label style={lbl}>{t("assets.docs.f.number")}</label><input style={inp} value={editing.number ?? ""} onChange={(e) => setEditing({ ...editing, number: e.target.value })} /></div>
              <div><label style={lbl}>{t("assets.docs.f.issuer")}</label><input style={inp} value={editing.issuer ?? ""} onChange={(e) => setEditing({ ...editing, issuer: e.target.value })} /></div>
              <div><label style={lbl}>{t("assets.docs.f.docDate")}</label><input type="date" style={inp} value={editing.docDate?.slice(0, 10) ?? ""} onChange={(e) => setEditing({ ...editing, docDate: e.target.value })} /></div>
              <div><label style={lbl}>{t("assets.docs.f.validFrom")}</label><input type="date" style={inp} value={editing.validFrom?.slice(0, 10) ?? ""} onChange={(e) => setEditing({ ...editing, validFrom: e.target.value })} /></div>
              <div><label style={lbl}>{t("assets.docs.f.validTo")}</label><input type="date" style={inp} value={editing.validTo?.slice(0, 10) ?? ""} onChange={(e) => setEditing({ ...editing, validTo: e.target.value })} /></div>
              {editing.validTo && (
                <div><label style={lbl}>{t("assets.docs.f.reminder")}</label>
                  <select style={inp} value={editing.reminderDays ?? ""} onChange={(e) => setEditing({ ...editing, reminderDays: e.target.value ? Number(e.target.value) : null })}>
                    <option value="">{t("assets.docs.f.noReminder")}</option>
                    {REMINDER_DAY_OPTIONS.map((d) => <option key={d} value={d}>{t("assets.docs.f.reminderDays", { n: d })}</option>)}
                  </select></div>
              )}
            </div>
            <div style={{ marginTop: 8 }}><label style={lbl}>{t("assets.docs.f.note")}</label><textarea style={{ ...inp, minHeight: 44 }} value={editing.note ?? ""} onChange={(e) => setEditing({ ...editing, note: e.target.value })} /></div>
            <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
              <button className="btn btn-primary btn-sm" disabled={busy} onClick={saveEdit}>{t("assets.docs.save")}</button>
              <button className="btn btn-ghost btn-sm" onClick={() => setEditing(null)}>{t("assets.docs.cancel")}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
