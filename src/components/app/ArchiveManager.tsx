"use client";

import { useState, useEffect, useRef } from "react";

type ArchiveFile = { id: string; name: string; category: string | null; mimeType: string; size: number; uploadedAt: string };

const CATEGORIES = ["Договори", "Фактури", "Счетоводни", "Кадрови", "Банкови", "Юридически", "Други"];

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function ArchiveManager() {
  const [files, setFiles] = useState<ArchiveFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [category, setCategory] = useState("Други");
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
    if (file.size > 5 * 1024 * 1024) { setError("Файлът е твърде голям (макс. 5 MB)."); return; }
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
    else setError((await res.json()).error ?? "Грешка при качване.");
  }

  async function remove(id: string) {
    if (!confirm("Изтриване на файла?")) return;
    const res = await fetch(`/api/archive-files/${id}`, { method: "DELETE" });
    if (res.ok) setFiles((f) => f.filter((x) => x.id !== id));
  }

  return (
    <>
      <div className="glass panel" style={{ padding: "20px 24px", marginBottom: 16 }}>
        <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 15, margin: "0 0 12px" }}>Качване на документ</h3>
        {error && <div style={{ background: "var(--brick-soft)", color: "var(--brick)", borderRadius: 6, padding: "8px 12px", fontSize: 12.5, marginBottom: 12 }}>{error}</div>}
        <div style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
          <div>
            <label>Категория</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)} style={{ width: 180 }}>
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <input ref={inputRef} type="file" onChange={onFile} disabled={uploading}
              style={{ display: "block", fontSize: 13 }} />
          </div>
          {uploading && <span style={{ fontSize: 12.5, color: "var(--muted)" }}>Качване…</span>}
        </div>
        <p style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 10 }}>Поддържат се всякакви файлове до 5 MB (PDF, изображения, документи).</p>
      </div>

      <div className="glass panel" style={{ padding: "8px 0" }}>
        {loading ? (
          <div style={{ padding: "32px", color: "var(--muted)", fontSize: 13 }}>Зареждане…</div>
        ) : files.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px 0", color: "var(--muted)" }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🗂️</div>
            <div style={{ fontSize: 14 }}>Няма качени файлове</div>
          </div>
        ) : (
          <table>
            <thead><tr><th>Файл</th><th>Категория</th><th>Размер</th><th>Качен на</th><th></th></tr></thead>
            <tbody>
              {files.map((f) => (
                <tr key={f.id}>
                  <td style={{ fontWeight: 600, fontSize: 13.5 }}>{f.name}</td>
                  <td style={{ fontSize: 13 }}>{f.category ?? "—"}</td>
                  <td className="num" style={{ fontSize: 12.5, color: "var(--muted)" }}>{formatSize(f.size)}</td>
                  <td style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>{new Date(f.uploadedAt).toLocaleDateString("bg-BG")}</td>
                  <td style={{ display: "flex", gap: 6 }}>
                    <a href={`/api/archive-files/${f.id}`} className="btn btn-ghost btn-sm" download>↓ Свали</a>
                    <button onClick={() => remove(f.id)} className="btn btn-ghost btn-sm" style={{ color: "var(--brick)" }}>Изтрий</button>
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
