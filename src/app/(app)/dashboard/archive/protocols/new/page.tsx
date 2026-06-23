"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Client = { id: string; name: string };

export default function NewProtocolPage() {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { fetch("/api/clients").then((r) => r.json()).then(setClients).catch(() => {}); }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true); setError("");
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/handover-protocols", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        number: fd.get("number") || undefined,
        counterpartyId: fd.get("counterpartyId") || null,
        date: fd.get("date"),
        description: fd.get("description") || null,
      }),
    });
    setSaving(false);
    if (res.ok) router.push("/dashboard/archive");
    else setError((await res.json()).error ?? "Грешка при запис.");
  }

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
        <Link href="/dashboard/archive" style={{ color: "var(--muted)", textDecoration: "none", fontSize: 13 }}>← Архив</Link>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 600, margin: 0 }}>Нов приемо-предавателен протокол</h1>
      </div>
      {error && <div style={{ background: "var(--brick-soft)", border: "1px solid var(--brick)", color: "var(--brick)", borderRadius: 8, padding: "10px 14px", fontSize: 13, marginBottom: 16 }}>{error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="glass panel" style={{ padding: 28, marginBottom: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px,1fr))", gap: 14 }}>
            <div><label>Номер (по избор — авто)</label><input type="text" name="number" placeholder="ППП-2026-0001" /></div>
            <div><label>Дата *</label><input type="date" name="date" required defaultValue={new Date().toISOString().slice(0,10)} /></div>
            <div><label>Контрагент (клиент)</label><select name="counterpartyId"><option value="">—</option>{clients.map((c)=><option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
            <div style={{ gridColumn: "1 / -1" }}><label>Описание</label><textarea name="description" rows={4} placeholder="Предадени/приети стоки, услуги или активи…" /></div>
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <Link href="/dashboard/archive" className="btn btn-ghost">Отказ</Link>
          <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? "Записване…" : "Създай ППП"}</button>
        </div>
      </form>
    </>
  );
}
