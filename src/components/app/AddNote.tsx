"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AddNote({ clientId }: { clientId: string }) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  async function add() {
    if (!note.trim()) return;
    setSaving(true);
    const res = await fetch(`/api/clients/${clientId}/notes`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note }),
    });
    setSaving(false);
    if (res.ok) { setNote(""); router.refresh(); }
  }

  return (
    <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
      <input type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Добави бележка…" onKeyDown={(e) => e.key === "Enter" && add()} />
      <button onClick={add} className="btn btn-primary btn-sm" disabled={saving || !note.trim()}>Добави</button>
    </div>
  );
}
