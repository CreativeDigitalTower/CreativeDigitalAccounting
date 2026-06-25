"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Item = { id: string; name: string; quantity: number; unit: string };
type Supplier = { id: string; name: string };

export default function ReceiveStockPage() {
  const router = useRouter();
  const [items, setItems] = useState<Item[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/warehouse/items/list").then((r) => r.json()).then((d) => setItems(Array.isArray(d) ? d : [])).catch(() => {});
    fetch("/api/suppliers").then((r) => r.json()).then(setSuppliers).catch(() => {});
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true); setError("");
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/warehouse/receive", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        stockItemId: fd.get("stockItemId"),
        quantity: Number(fd.get("quantity")),
        unitPrice: fd.get("unitPrice") ? Number(fd.get("unitPrice")) : null,
        supplierId: fd.get("supplierId") || null,
        batchNumber: fd.get("batchNumber") || null,
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
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 600, margin: 0 }}>Заприходяване</h1>
      </div>
      {error && <div style={{ background: "var(--brick-soft)", border: "1px solid var(--brick)", color: "var(--brick)", borderRadius: 8, padding: "10px 14px", fontSize: 13, marginBottom: 16 }}>{error}</div>}
      {items.length === 0 && <div style={{ background: "var(--brass-soft)", border: "1px solid var(--brass)", color: "var(--brass)", borderRadius: 8, padding: "10px 14px", fontSize: 13, marginBottom: 16 }}>Нямате артикули. Първо <Link href="/dashboard/warehouse/items/new">добавете артикул</Link>.</div>}
      <form onSubmit={handleSubmit}>
        <div className="glass panel" style={{ padding: 28, marginBottom: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px,1fr))", gap: 14 }}>
            <div style={{ gridColumn: "1 / -1" }}><label>Артикул *</label>
              <select name="stockItemId" required><option value="">— Изберете —</option>{items.map((i)=><option key={i.id} value={i.id}>{i.name} (наличност: {i.quantity} {i.unit})</option>)}</select>
            </div>
            <div><label>Количество *</label><input type="number" name="quantity" step="0.01" min="0.01" required /></div>
            <div><label>Ед. цена (EUR)</label><input type="number" name="unitPrice" step="0.01" min="0" /></div>
            <div><label>Доставчик</label><select name="supplierId"><option value="">—</option>{suppliers.map((s)=><option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
            <div><label>Партиден номер</label><input type="text" name="batchNumber" placeholder="напр. L2026-0617" /></div>
            <div><label>Дата *</label><input type="date" name="date" required defaultValue={new Date().toISOString().slice(0,10)} /></div>
            <div style={{ gridColumn: "1 / -1" }}><label>Бележка</label><input type="text" name="note" /></div>
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <Link href="/dashboard/warehouse" className="btn btn-ghost">Отказ</Link>
          <button type="submit" className="btn btn-primary" disabled={saving || items.length === 0}>{saving ? "Записване…" : "Заприходи"}</button>
        </div>
      </form>
    </>
  );
}
