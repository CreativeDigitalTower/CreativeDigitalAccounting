"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/components/i18n/I18nProvider";

/**
 * Преизползваема клетка за качен файл: преглед, сваляне, замяна и премахване.
 * `endpoint` е базовият URL на ресурса (напр. /api/expenses/<id>).
 * Файлът се сервира от `${endpoint}/attachment` (?view=1 за преглед).
 * Замяната праща PUT `${endpoint}` с { attachmentUrl }.
 */
export function AttachmentCell({ endpoint, hasFile, maxMB = 5 }: { endpoint: string; hasFile: boolean; maxMB?: number }) {
  const t = useT();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function upload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; e.target.value = "";
    if (!file) return;
    setErr("");
    if (file.size > maxMB * 1024 * 1024) { setErr(t("misc.attachment.maxMB", { n: maxMB })); return; }
    setBusy(true);
    const dataUrl = await new Promise<string>((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result as string); r.onerror = rej; r.readAsDataURL(file); });
    const resp = await fetch(endpoint, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ attachmentUrl: dataUrl }) });
    setBusy(false);
    if (resp.ok) router.refresh(); else setErr(t("misc.attachment.error"));
  }

  async function remove() {
    if (!confirm(t("misc.attachment.confirmRemove"))) return;
    setBusy(true);
    const resp = await fetch(endpoint, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ attachmentUrl: null }) });
    setBusy(false);
    if (resp.ok) router.refresh();
  }

  const labelStyle: React.CSSProperties = { fontSize: 11.5, cursor: "pointer", color: "var(--navy)", fontWeight: 600 };

  if (busy) return <span style={{ fontSize: 11.5, color: "var(--muted)" }}>…</span>;

  return (
    <span style={{ display: "inline-flex", gap: 8, alignItems: "center", whiteSpace: "nowrap" }}>
      {hasFile ? (
        <>
          <a href={`${endpoint}/attachment?view=1`} target="_blank" rel="noreferrer" style={labelStyle} title={t("misc.attachment.view")}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" style={{verticalAlign:"-2px"}}><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg></a>
          <a href={`${endpoint}/attachment`} style={labelStyle} title={t("misc.attachment.download")}>↓</a>
          <label style={labelStyle} title={t("misc.attachment.replace")}>↻<input type="file" accept="application/pdf,image/*" onChange={upload} style={{ display: "none" }} /></label>
          <button onClick={remove} title={t("misc.attachment.remove")} style={{ background: "none", border: "none", color: "var(--brick)", cursor: "pointer", fontSize: 13 }}>×</button>
        </>
      ) : (
        <label style={{ ...labelStyle, color: "var(--muted)" }} title={t("misc.attachment.attach")}>{t("misc.attachment.attachLabel")}<input type="file" accept="application/pdf,image/*" onChange={upload} style={{ display: "none" }} /></label>
      )}
      {err && <span style={{ color: "var(--brick)", fontSize: 10.5 }}>{err}</span>}
    </span>
  );
}
