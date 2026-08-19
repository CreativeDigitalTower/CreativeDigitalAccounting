"use client";
import { useEffect, useRef, useState } from "react";
import { useT } from "@/components/i18n/I18nProvider";
import { REQUEST_TYPES, ALLOWED_ATTACHMENT_MIME, MAX_ATTACHMENTS, MAX_ATTACHMENT_BYTES } from "@/lib/featureRequest/config";

type Ctx = { companyName: string; contactEmail: string; contactPhone: string; sectorHint: string; scope: string };
type Att = { fileName: string; mimeType: string; size: number; dataUrl: string };

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result as string); r.onerror = rej; r.readAsDataURL(file); });
}

export function FeatureRequestModal({ onClose }: { onClose: () => void }) {
  const t = useT();
  const [ctx, setCtx] = useState<Ctx | null>(null);
  const [f, setF] = useState({ type: "feature", title: "", description: "", benefit: "", contactEmail: "", contactPhone: "" });
  const [atts, setAtts] = useState<Att[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/feature-requests/context").then((r) => r.ok ? r.json() : null).then((c) => {
      if (c) { setCtx(c); setF((s) => ({ ...s, contactEmail: c.contactEmail, contactPhone: c.contactPhone })); }
    });
  }, []);

  async function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const list = Array.from(e.target.files ?? []);
    e.target.value = "";
    for (const file of list) {
      if (atts.length >= MAX_ATTACHMENTS) { setErr(t("featureRequest.form.tooMany")); break; }
      if (!ALLOWED_ATTACHMENT_MIME.includes(file.type)) { setErr(t("featureRequest.form.badType")); continue; }
      if (file.size > MAX_ATTACHMENT_BYTES) { setErr(t("featureRequest.form.tooBig")); continue; }
      const dataUrl = await fileToDataUrl(file);
      setAtts((a) => a.length < MAX_ATTACHMENTS ? [...a, { fileName: file.name, mimeType: file.type, size: file.size, dataUrl }] : a);
    }
  }

  async function submit() {
    if (!f.title.trim() || !f.description.trim() || !f.contactEmail.trim()) { setErr(t("featureRequest.form.required")); return; }
    setBusy(true); setErr("");
    const r = await fetch("/api/feature-requests", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: f.type, title: f.title, description: f.description, benefit: f.benefit || null, contactEmail: f.contactEmail, contactPhone: f.contactPhone || null, scope: ctx?.scope, attachments: atts }),
    });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    if (r.ok) setDone(true);
    else setErr(j.duplicate ? t("featureRequest.form.duplicate") : (r.status === 429 ? t("featureRequest.form.rateLimit") : (j.error ?? t("featureRequest.form.error"))));
  }

  const inp = { padding: "8px 11px", fontSize: 13, width: "100%" } as const;
  const lbl = { fontSize: 12, color: "var(--muted)", display: "block", marginBottom: 3, fontWeight: 600 } as const;

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60, padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()} className="glass panel" style={{ maxWidth: 620, width: "100%", maxHeight: "94vh", overflowY: "auto" }}>
        {done ? (
          <div style={{ textAlign: "center", padding: "20px 10px" }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>✅</div>
            <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 20, margin: "0 0 6px" }}>{t("featureRequest.form.doneTitle")}</h3>
            <p style={{ fontSize: 13.5, color: "var(--ink-soft)", marginBottom: 16 }}>{t("featureRequest.form.doneText")}</p>
            <button className="btn btn-primary" onClick={onClose}>{t("featureRequest.form.close")}</button>
          </div>
        ) : (
          <>
            <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 20, margin: "0 0 4px" }}>{t("featureRequest.form.title")}</h3>
            <p style={{ fontSize: 12.5, color: "var(--muted)", marginBottom: 14 }}>{t("featureRequest.form.subtitle")}</p>
            <div style={{ fontSize: 12, background: "var(--emerald-soft)", color: "var(--emerald-dark,#0F8A6A)", borderRadius: 8, padding: "8px 12px", marginBottom: 14, fontWeight: 600 }}>{t("featureRequest.form.freeBadge")}</div>
            {ctx && <div style={{ fontSize: 11.5, color: "var(--muted)", marginBottom: 12 }}>{t("featureRequest.form.sentFrom", { company: ctx.companyName })}{ctx.scope === "firm" ? ` · ${t("featureRequest.form.scopeFirm")}` : ""}</div>}
            {err && <div style={{ color: "var(--brick)", fontSize: 12.5, marginBottom: 10 }}>{err}</div>}

            <div style={{ display: "grid", gap: 12 }}>
              <div><label style={lbl}>{t("featureRequest.form.title2")} *</label><input style={inp} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder={t("featureRequest.form.titlePh")} /></div>
              <div><label style={lbl}>{t("featureRequest.form.type")} *</label>
                <select style={inp} value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })}>
                  {REQUEST_TYPES.map((ty) => <option key={ty} value={ty}>{t(`featureRequest.type.${ty}`)}</option>)}
                </select></div>
              <div><label style={lbl}>{t("featureRequest.form.desc")} *</label><textarea style={{ ...inp, minHeight: 100, resize: "vertical", fontFamily: "inherit" }} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} placeholder={t("featureRequest.form.descPh")} /></div>
              <div><label style={lbl}>{t("featureRequest.form.benefit")}</label><textarea style={{ ...inp, minHeight: 60, resize: "vertical", fontFamily: "inherit" }} value={f.benefit} onChange={(e) => setF({ ...f, benefit: e.target.value })} /></div>
              <div>
                <label style={lbl}>{t("featureRequest.form.attach")}</label>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => fileInput.current?.click()} disabled={atts.length >= MAX_ATTACHMENTS}>+ {t("featureRequest.form.addFile")}</button>
                  <input ref={fileInput} type="file" hidden multiple accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png" onChange={pick} />
                  {atts.map((a, i) => <span key={i} style={{ fontSize: 11.5, background: "rgba(0,0,0,.05)", borderRadius: 8, padding: "3px 8px" }}>{a.fileName} <button onClick={() => setAtts((x) => x.filter((_, j) => j !== i))} style={{ border: 0, background: "none", cursor: "pointer", color: "var(--brick)" }}>✕</button></span>)}
                </div>
                <div style={{ fontSize: 10.5, color: "var(--muted)", marginTop: 3 }}>{t("featureRequest.form.fileHint")}</div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div><label style={lbl}>{t("featureRequest.form.email")}</label><input style={inp} value={f.contactEmail} onChange={(e) => setF({ ...f, contactEmail: e.target.value })} /></div>
                <div><label style={lbl}>{t("featureRequest.form.phone")}</label><input style={inp} value={f.contactPhone} onChange={(e) => setF({ ...f, contactPhone: e.target.value })} /></div>
              </div>
            </div>

            <p style={{ fontSize: 10.5, color: "var(--muted)", margin: "12px 0" }}>{t("featureRequest.form.disclaimer")}</p>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button className="btn btn-ghost btn-sm" onClick={onClose}>{t("featureRequest.form.cancel")}</button>
              <button className="btn btn-primary btn-sm" disabled={busy} onClick={submit}>{busy ? "…" : t("featureRequest.form.send")}</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
