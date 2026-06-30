"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Преизползваема клетка за качен файл: преглед, сваляне, замяна и премахване.
 * `endpoint` е базовият URL на ресурса (напр. /api/expenses/<id>).
 * Файлът се сервира от `${endpoint}/attachment` (?view=1 за преглед).
 * Замяната праща PUT `${endpoint}` с { attachmentUrl }.
 */
export function AttachmentCell({ endpoint, hasFile, maxMB = 5 }: { endpoint: string; hasFile: boolean; maxMB?: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function upload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; e.target.value = "";
    if (!file) return;
    setErr("");
    if (file.size > maxMB * 1024 * 1024) { setErr(`Макс. ${maxMB}MB`); return; }
    setBusy(true);
    const dataUrl = await new Promise<string>((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result as string); r.onerror = rej; r.readAsDataURL(file); });
    const resp = await fetch(endpoint, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ attachmentUrl: dataUrl }) });
    setBusy(false);
    if (resp.ok) router.refresh(); else setErr("Грешка");
  }

  async function remove() {
    if (!confirm("Премахване на файла?")) return;
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
          <a href={`${endpoint}/attachment?view=1`} target="_blank" rel="noreferrer" style={labelStyle} title="Преглед">👁</a>
          <a href={`${endpoint}/attachment`} style={labelStyle} title="Свали">↓</a>
          <label style={labelStyle} title="Замени">↻<input type="file" accept="application/pdf,image/*" onChange={upload} style={{ display: "none" }} /></label>
          <button onClick={remove} title="Премахни" style={{ background: "none", border: "none", color: "var(--brick)", cursor: "pointer", fontSize: 13 }}>×</button>
        </>
      ) : (
        <label style={{ ...labelStyle, color: "var(--muted)" }} title="Прикачи файл">＋ файл<input type="file" accept="application/pdf,image/*" onChange={upload} style={{ display: "none" }} /></label>
      )}
      {err && <span style={{ color: "var(--brick)", fontSize: 10.5 }}>{err}</span>}
    </span>
  );
}
