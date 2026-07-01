"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

/** Номер на документ — заключен по подразбиране; молив го отключва за редакция. */
export function EditableDocNumber({ id, initial }: { id: string; initial: string }) {
  const router = useRouter();
  const [number, setNumber] = useState(initial);
  const [edit, setEdit] = useState(false);
  const [val, setVal] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    if (val.trim() === number) { setEdit(false); return; }
    setBusy(true); setError("");
    const res = await fetch(`/api/documents/${id}/number`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ number: val.trim() }),
    });
    setBusy(false);
    if (res.ok) { setNumber(val.trim()); setEdit(false); router.refresh(); }
    else setError((await res.json()).error ?? "Грешка");
  }

  if (edit) {
    return (
      <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
        <input value={val} onChange={(e) => setVal(e.target.value)} autoFocus disabled={busy}
          onKeyDown={(e) => { if (e.key === "Enter") save(); if (e.key === "Escape") { setEdit(false); setVal(number); } }}
          style={{ width: 160, padding: "4px 8px", fontSize: 18, fontFamily: "'IBM Plex Mono', monospace" }} />
        <button onClick={save} disabled={busy} className="btn btn-primary btn-sm">{busy ? "…" : "Запази"}</button>
        <button onClick={() => { setEdit(false); setVal(number); setError(""); }} className="btn btn-ghost btn-sm">✕</button>
        {error && <span style={{ fontSize: 11.5, color: "var(--brick)" }}>{error}</span>}
      </span>
    );
  }

  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      <span className="num">{number}</span>
      <button onClick={() => { setVal(number); setEdit(true); }} title="Редактирай номера (заключен по подразбиране)"
        style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", fontSize: 14, padding: 2 }}>
        🔒✎
      </button>
    </span>
  );
}
