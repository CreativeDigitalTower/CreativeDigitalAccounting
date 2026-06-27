"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Item = { id: string; name: string; quantity: number; unit: string };

export default function IssueStockPage() {
  const router = useRouter();
  const [items, setItems] = useState<Item[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/warehouse/items/list").then((r) => r.json()).then((d) => setItems(Array.isArray(d) ? d : [])).catch(() => {});
  }, []);

  const selected = items.find((i) => i.id === selectedId);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true); setError("");
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/warehouse/issue", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        stockItemId: fd.get("stockItemId"),
        quantity: Number(fd.get("quantity")),
        date: fd.get("date"),
        note: fd.get("note") || null,
      }),
    });
    setSaving(false);
    if (res.ok) router.push("/dashboard/warehouse");
    else setError((await res.json()).error ?? "Грешка при запис.");
  }

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
        <Link href="/dashboard/warehouse" style={{ color: "var(--muted)", textDecoration: "none", fontSize: 13 }}>← Склад</Link>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 600, margin: 0 }}>Изписване на стока</h1>
      </div>

      {error && <div style={{ background: "var(--brick-soft)", border: "1px solid var(--brick)", color: "var(--brick)", borderRadius: 8, padding: "10px 14px", fontSize: 13, marginBottom: 16 }}>{error}</div>}

      <form onSubmit={handleSubmit} className="glass panel" style={{ padding: "24px 28px", maxWidth: 560, display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <label>Артикул *</label>
          <select name="stockItemId" required value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
            <option value="">— Изберете артикул —</option>
            {items.map((i) => <option key={i.id} value={i.id}>{i.name} (налично: {i.quantity} {i.unit})</option>)}
          </select>
          {selected && <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>Налична наличност: <strong>{selected.quantity} {selected.unit}</strong></div>}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div><label>Количество за изписване{selected ? ` (в ${selected.unit})` : ""} *</label><input type="number" name="quantity" step="any" min="0" max={selected?.quantity} required placeholder={selected ? `напр. 5 ${selected.unit}` : "количество"} /></div>
          <div><label>Дата *</label><input type="date" name="date" defaultValue={new Date().toISOString().slice(0, 10)} required /></div>
        </div>
        <div>
          <label>Причина / Основание</label>
          <input type="text" name="note" placeholder="Напр. продажба, брак, вложено в производство…" />
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <Link href="/dashboard/warehouse" className="btn btn-ghost">Отказ</Link>
          <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? "Записване…" : "Изпиши"}</button>
        </div>
      </form>
    </>
  );
}
