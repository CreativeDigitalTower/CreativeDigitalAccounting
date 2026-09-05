"use client";
import { useRef, useState } from "react";
import { useT } from "@/components/i18n/I18nProvider";
import { CURRENCIES } from "@/lib/constants";

export type ProductForm = {
  id: string; canonicalName: string; category: string | null; materialCode: string | null; unit: string;
  packaging: string | null; certificateNumber: string | null; purchasePrice: number | null; purchaseCurrency: string | null;
  active: boolean; hasCertificatePdf: boolean; certificateFileName: string | null;
};

const fileToDataUrl = (f: File) => new Promise<string>((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.onerror = rej; r.readAsDataURL(f); });

// Пълна редакция на продукт (§9/§13/§33): наименование, вид, material code, мерна единица,
// разфасовка, сертификат №, покупна цена + валута, PDF сертификат, статус.
export function ProductEditModal({ initial, onClose, onSaved }: { initial: ProductForm; onClose: () => void; onSaved: () => void }) {
  const t = useT();
  const [f, setF] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  async function save() {
    setErr(""); setBusy(true);
    const body = {
      canonicalName: f.canonicalName, category: f.category, materialCode: f.materialCode || null, unit: f.unit,
      packaging: f.packaging || null, certificateNumber: f.certificateNumber || null,
      purchasePrice: f.purchasePrice === null || Number.isNaN(f.purchasePrice) ? null : Number(f.purchasePrice),
      purchaseCurrency: f.purchaseCurrency || "EUR", active: f.active,
    };
    const r = await fetch(`/api/logistics/products/${f.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) { setErr(j.error ?? t("logistics.common.err")); return; }
    onSaved();
  }

  async function uploadCert() {
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf") { setErr(t("logistics.products.pdfOnly")); return; }
    setBusy(true); setErr("");
    const dataUrl = await fileToDataUrl(file);
    const r = await fetch(`/api/logistics/products/${f.id}/certificate`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ dataUrl, originalFilename: file.name, mimeType: file.type, size: file.size }) });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) { setErr(j.error ?? t("logistics.common.err")); return; }
    setF({ ...f, hasCertificatePdf: true, certificateFileName: j.certificateFileName ?? file.name });
    if (fileRef.current) fileRef.current.value = "";
  }
  async function delCert() {
    setBusy(true); setErr("");
    const r = await fetch(`/api/logistics/products/${f.id}/certificate`, { method: "DELETE" });
    setBusy(false);
    if (r.ok) setF({ ...f, hasCertificatePdf: false, certificateFileName: null });
  }

  const lbl = { fontSize: 11.5, color: "var(--muted)", display: "block", marginBottom: 3 } as const;
  const inp = { padding: "7px 9px", fontSize: 13, width: "100%" } as const;

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(20,30,25,.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()} className="glass panel" style={{ maxWidth: 560, width: "100%", maxHeight: "90vh", overflowY: "auto", background: "var(--paper)" }}>
        <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 17, margin: "0 0 12px" }}>{t("logistics.products.editTitle")}</h3>
        {err && <div style={{ color: "var(--brick)", fontSize: 12.5, marginBottom: 10 }}>{err}</div>}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div style={{ gridColumn: "1 / -1" }}><label style={lbl}>{t("logistics.products.name")}</label><input style={inp} value={f.canonicalName} onChange={(e) => setF({ ...f, canonicalName: e.target.value })} /></div>
          <div><label style={lbl}>{t("logistics.products.category")}</label>
            <select style={inp} value={f.category ?? "bulk"} onChange={(e) => setF({ ...f, category: e.target.value })}>
              <option value="bulk">{t("logistics.products.categoryBulk")}</option>
              <option value="packaged">{t("logistics.products.categoryPackaged")}</option>
            </select></div>
          <div><label style={lbl}>{t("logistics.products.materialCode")}</label><input style={inp} value={f.materialCode ?? ""} onChange={(e) => setF({ ...f, materialCode: e.target.value })} /></div>
          <div><label style={lbl}>{t("logistics.products.unit")}</label><input style={inp} value={f.unit} onChange={(e) => setF({ ...f, unit: e.target.value })} /></div>
          <div><label style={lbl}>{t("logistics.products.packaging")}</label><input style={inp} value={f.packaging ?? ""} onChange={(e) => setF({ ...f, packaging: e.target.value })} /></div>
          <div><label style={lbl}>{t("logistics.products.certificate")}</label><input style={inp} value={f.certificateNumber ?? ""} onChange={(e) => setF({ ...f, certificateNumber: e.target.value })} placeholder="2032-CPR-…" /></div>
          <div><label style={lbl}>{t("logistics.products.purchasePrice")}</label>
            <input style={inp} type="number" min={0} step="0.01" value={f.purchasePrice ?? ""} onChange={(e) => setF({ ...f, purchasePrice: e.target.value === "" ? null : Number(e.target.value) })} /></div>
          <div><label style={lbl}>{t("logistics.products.currency")}</label>
            <select style={inp} value={f.purchaseCurrency ?? "EUR"} onChange={(e) => setF({ ...f, purchaseCurrency: e.target.value })}>
              {CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.code}</option>)}
            </select></div>
        </div>

        {/* PDF сертификат */}
        <div style={{ marginTop: 14, padding: "10px 12px", border: "1px solid var(--border)", borderRadius: 8 }}>
          <div style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 6 }}>{t("logistics.products.certPdf")}</div>
          {f.hasCertificatePdf ? (
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", fontSize: 12.5 }}>
              <span>📄 {f.certificateFileName ?? "certificate.pdf"}</span>
              <a className="btn btn-ghost btn-sm" href={`/api/logistics/products/${f.id}/certificate/file?inline=1`} target="_blank" rel="noreferrer">{t("logistics.products.viewCert")}</a>
              <label className="btn btn-ghost btn-sm" style={{ cursor: "pointer" }}>{t("logistics.products.replaceCert")}<input ref={fileRef} type="file" accept="application/pdf" style={{ display: "none" }} onChange={uploadCert} /></label>
              <button className="btn btn-ghost btn-sm" style={{ color: "var(--brick)" }} disabled={busy} onClick={delCert}>{t("logistics.products.deleteCert")}</button>
            </div>
          ) : (
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input ref={fileRef} type="file" accept="application/pdf" style={{ fontSize: 12 }} />
              <button className="btn btn-ghost btn-sm" disabled={busy} onClick={uploadCert}>{t("logistics.products.uploadCert")}</button>
            </div>
          )}
        </div>

        <div style={{ display: "flex", gap: 8, justifyContent: "space-between", alignItems: "center", marginTop: 16 }}>
          <label style={{ fontSize: 12.5, display: "flex", gap: 6, alignItems: "center" }}>
            <input type="checkbox" checked={f.active} onChange={(e) => setF({ ...f, active: e.target.checked })} style={{ width: "auto" }} />{t("logistics.common.active")}
          </label>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-ghost btn-sm" onClick={onClose} disabled={busy}>{t("logistics.common.cancel")}</button>
            <button className="btn btn-primary btn-sm" onClick={save} disabled={busy || !f.canonicalName}>{t("logistics.common.save")}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
