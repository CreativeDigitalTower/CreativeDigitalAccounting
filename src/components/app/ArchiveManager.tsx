"use client";

import { useState, useEffect, useRef } from "react";
import { useI18n } from "@/components/i18n/I18nProvider";

type ArchiveFile = { id: string; name: string; category: string | null; mimeType: string; size: number; uploadedAt: string };

const CATEGORY_KEYS = ["contracts", "invoices", "accounting", "hr", "bank", "legal", "other"];

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function ArchiveManager() {
  const { t, locale } = useI18n();
  const catLabel = (v: string | null) => { if (!v) return "—"; const l = t(`modules.archive.categories.${v}`); return l.startsWith("modules.") ? v : l; };
  const [files, setFiles] = useState<ArchiveFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [category, setCategory] = useState("other");
  const inputRef = useRef<HTMLInputElement>(null);

  async function load() {
    const r = await fetch("/api/archive-files");
    setFiles(r.ok ? await r.json() : []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    if (file.size > 5 * 1024 * 1024) { setError(t("modules.archive.fileTooLarge")); return; }
    setUploading(true);
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    const res = await fetch("/api/archive-files", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: file.name, category, mimeType: file.type || "application/octet-stream", size: file.size, dataUrl }),
    });
    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
    if (res.ok) load();
    else setError((await res.json()).error ?? t("modules.archive.errUpload"));
  }

  async function remove(id: string) {
    if (!confirm(t("modules.archive.confirmDelete"))) return;
    const res = await fetch(`/api/archive-files/${id}`, { method: "DELETE" });
    if (res.ok) setFiles((f) => f.filter((x) => x.id !== id));
  }

  return (
    <>
      <div className="glass panel" style={{ padding: "20px 24px", marginBottom: 16 }}>
        <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 15, margin: "0 0 12px" }}>{t("modules.archive.uploadTitle")}</h3>
        {error && <div style={{ background: "var(--brick-soft)", color: "var(--brick)", borderRadius: 6, padding: "8px 12px", fontSize: 12.5, marginBottom: 12 }}>{error}</div>}
        <div style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
          <div>
            <label>{t("modules.archive.category")}</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)} style={{ width: 180 }}>
              {CATEGORY_KEYS.map((c) => <option key={c} value={c}>{t(`modules.archive.categories.${c}`)}</option>)}
            </select>
          </div>
          <div>
            <input ref={inputRef} type="file" onChange={onFile} disabled={uploading}
              style={{ display: "block", fontSize: 13 }} />
          </div>
          {uploading && <span style={{ fontSize: 12.5, color: "var(--muted)" }}>{t("modules.archive.uploading")}</span>}
        </div>
        <p style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 10 }}>{t("modules.archive.hint")}</p>
      </div>

      <div className="glass panel" style={{ padding: "8px 0" }}>
        {loading ? (
          <div style={{ padding: "32px", color: "var(--muted)", fontSize: 13 }}>{t("modules.archive.loading")}</div>
        ) : files.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px 0", color: "var(--muted)" }}>
            <div style={{ display:"flex",justifyContent:"center",marginBottom: 12, color:"var(--muted)" }}><svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" style={{verticalAlign:"-2px"}}><path d="M3 7a2 2 0 0 1 2-2h4l2 2.5h8a2 2 0 0 1 2 2V18a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z"/></svg></div>
            <div style={{ fontSize: 14 }}>{t("modules.archive.empty")}</div>
          </div>
        ) : (
          <table>
            <thead><tr><th>{t("modules.archive.th.file")}</th><th>{t("modules.archive.th.category")}</th><th>{t("modules.archive.th.size")}</th><th>{t("modules.archive.th.uploadedAt")}</th><th></th></tr></thead>
            <tbody>
              {files.map((f) => (
                <tr key={f.id}>
                  <td style={{ fontWeight: 600, fontSize: 13.5 }}>{f.name}</td>
                  <td style={{ fontSize: 13 }}>{catLabel(f.category)}</td>
                  <td className="num" style={{ fontSize: 12.5, color: "var(--muted)" }}>{formatSize(f.size)}</td>
                  <td style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>{new Date(f.uploadedAt).toLocaleDateString(locale)}</td>
                  <td style={{ display: "flex", gap: 6 }}>
                    <a href={`/api/archive-files/${f.id}`} className="btn btn-ghost btn-sm" download>{t("modules.archive.download")}</a>
                    <button onClick={() => remove(f.id)} className="btn btn-ghost btn-sm" style={{ color: "var(--brick)" }}>{t("modules.archive.delete")}</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
