"use client";

import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/components/i18n/I18nProvider";
import { validatePdfUpload, formatFileSize, MAX_ATTACHMENT_BYTES } from "@/lib/attachments";

export type Attachment = {
  id: string; filename: string; originalFilename: string; mimeType: string; size: number; createdAt: string;
};

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

/** Секция „Приложения към фактурата" — drag&drop, качване, преглед/сваляне/замяна/премахване на PDF. */
export function InvoiceAttachments({ documentId, initial }: { documentId: string; initial?: Attachment[] }) {
  const { t, locale } = useI18n();
  const [items, setItems] = useState<Attachment[]>(initial ?? []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const addRef = useRef<HTMLInputElement>(null);
  const replaceRef = useRef<HTMLInputElement>(null);
  const [replaceId, setReplaceId] = useState<string | null>(null);

  const base = `/api/documents/${documentId}/attachments`;

  // Ако не са подадени начални данни (напр. в редактора) — зареждаме от API.
  useEffect(() => {
    if (initial !== undefined) return;
    let cancelled = false;
    fetch(base).then((r) => (r.ok ? r.json() : [])).then((d) => { if (!cancelled && Array.isArray(d)) setItems(d); }).catch(() => {});
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentId]);

  async function upload(file: File, replaceAttId?: string | null) {
    setError("");
    // Клиентска валидация (сървърът валидира отново)
    const v = validatePdfUpload({ filename: file.name, mimeType: file.type, size: file.size });
    if (!v.ok) { setError(v.error); return; }
    if (file.size > MAX_ATTACHMENT_BYTES) { setError(t("mailattach.attach.tooLarge")); return; }
    setBusy(true);
    try {
      const dataUrl = await fileToDataUrl(file);
      const payload = { filename: file.name, mimeType: file.type || "application/pdf", size: file.size, dataUrl };
      const url = replaceAttId ? `${base}/${replaceAttId}` : base;
      const res = await fetch(url, {
        method: replaceAttId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? t("mailattach.attach.errUpload")); return; }
      setItems((prev) => replaceAttId ? prev.map((a) => (a.id === replaceAttId ? data : a)) : [...prev, data]);
    } catch {
      setError(t("mailattach.attach.errUpload"));
    } finally {
      setBusy(false);
      setReplaceId(null);
    }
  }

  async function remove(id: string) {
    if (!confirm(t("mailattach.attach.confirmRemove"))) return;
    setBusy(true);
    const res = await fetch(`${base}/${id}`, { method: "DELETE" });
    setBusy(false);
    if (res.ok) setItems((prev) => prev.filter((a) => a.id !== id));
    else setError(t("mailattach.attach.errRemove"));
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault(); setDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    for (const f of files) upload(f);
  }

  return (
    <div className="glass panel" style={{ padding: "18px 20px", marginBottom: 16 }}>
      <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 15, margin: "0 0 4px" }}>{t("mailattach.attach.title")}</h3>
      <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 12 }}>{t("mailattach.attach.subtitle")}</div>

      {error && <div style={{ background: "var(--brick-soft)", color: "var(--brick)", borderRadius: 6, padding: "8px 10px", fontSize: 12.5, marginBottom: 10 }}>{error}</div>}

      {/* drag & drop зона */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => addRef.current?.click()}
        style={{
          border: `2px dashed ${dragOver ? "var(--emerald)" : "var(--border)"}`,
          borderRadius: 10, padding: "22px 16px", textAlign: "center", cursor: "pointer",
          background: dragOver ? "var(--emerald-soft, rgba(15,138,106,.06))" : "transparent", transition: "all .15s",
        }}
      >
        <div style={{ fontSize: 13, color: "var(--ink-soft)" }}>{t("mailattach.attach.dropHint")}</div>
        <button type="button" className="btn btn-ghost btn-sm" style={{ marginTop: 8 }} disabled={busy}
          onClick={(e) => { e.stopPropagation(); addRef.current?.click(); }}>
          {busy ? t("mailattach.attach.uploading") : t("mailattach.attach.uploadBtn")}
        </button>
        <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 6 }}>{t("mailattach.attach.limitHint", { max: formatFileSize(MAX_ATTACHMENT_BYTES) })}</div>
      </div>

      <input ref={addRef} type="file" accept="application/pdf,.pdf" hidden
        onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ""; }} />
      <input ref={replaceRef} type="file" accept="application/pdf,.pdf" hidden
        onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f, replaceId); e.target.value = ""; }} />

      {/* списък */}
      {items.length === 0 ? (
        <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 12 }}>{t("mailattach.attach.empty")}</div>
      ) : (
        <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 8 }}>
          {items.map((a) => (
            <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", border: "1px solid var(--border)", borderRadius: 8, flexWrap: "wrap" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--brick)" strokeWidth="1.7"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg>
              <div style={{ flex: 1, minWidth: 140 }}>
                <div style={{ fontSize: 13, fontWeight: 600, wordBreak: "break-all" }}>{a.filename}</div>
                <div style={{ fontSize: 11, color: "var(--muted)" }}>{formatFileSize(a.size)} · {new Date(a.createdAt).toLocaleDateString(locale)}</div>
              </div>
              <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                <a href={`${base}/${a.id}?inline=1`} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm">{t("mailattach.attach.preview")}</a>
                <a href={`${base}/${a.id}`} className="btn btn-ghost btn-sm">{t("mailattach.attach.download")}</a>
                <button type="button" className="btn btn-ghost btn-sm" disabled={busy}
                  onClick={() => { setReplaceId(a.id); replaceRef.current?.click(); }}>{t("mailattach.attach.replace")}</button>
                <button type="button" className="btn btn-ghost btn-sm" style={{ color: "var(--brick)" }} disabled={busy}
                  onClick={() => remove(a.id)}>{t("mailattach.attach.remove")}</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
