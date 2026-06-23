"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Warehouse = { id: string; name: string };

export default function NewStockItemPage() {
  const router = useRouter();
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { fetch("/api/warehouses").then((r) => r.json()).then((d) => setWarehouses(Array.isArray(d) ? d : [])).catch(() => {}); }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true); setError("");
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/warehouse/items", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        warehouseId: fd.get("warehouseId"),
        name: fd.get("name"), sku: fd.get("sku") || null,
        quantity: fd.get("quantity") ? Number(fd.get("quantity")) : 0,
        minQuantity: fd.get("minQuantity") ? Number(fd.get("minQuantity")) : null,
        unit: fd.get("unit") || "бр",
        unitCost: fd.get("unitCost") ? Number(fd.get("unitCost")) : null,
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
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 600, margin: 0 }}>Нов артикул</h1>
      </div>
      {error && <div style={{ background: "var(--brick-soft)", border: "1px solid var(--brick)", color: "var(--brick)", borderRadius: 8, padding: "10px 14px", fontSize: 13, marginBottom: 16 }}>{error}</div>}
      {warehouses.length === 0 && <div style={{ background: "var(--brass-soft)", border: "1px solid var(--brass)", color: "var(--brass)", borderRadius: 8, padding: "10px 14px", fontSize: 13, marginBottom: 16 }}>Нямате склад. Първо ще се ползва „Главен склад" (създаден автоматично при регистрация).</div>}
      <form onSubmit={handleSubmit}>
        <div className="glass panel" style={{ padding: 28, marginBottom: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px,1fr))", gap: 14 }}>
            <div><label>Склад *</label><select name="warehouseId" required>{warehouses.map((w)=><option key={w.id} value={w.id}>{w.name}</option>)}</select></div>
            <div style={{ gridColumn: "1 / -1" }}><label>Наименование *</label><input type="text" name="name" required /></div>
            <div><label>SKU / Код</label><input type="text" name="sku" /></div>
            <div><label>Ед. мярка</label><input type="text" name="unit" defaultValue="бр" /></div>
            <div><label>Начална наличност</label><input type="number" name="quantity" step="0.01" min="0" defaultValue={0} /></div>
            <div><label>Мин. наличност</label><input type="number" name="minQuantity" step="0.01" min="0" /></div>
            <div><label>Ед. цена (EUR)</label><input type="number" name="unitCost" step="0.01" min="0" /></div>
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <Link href="/dashboard/warehouse" className="btn btn-ghost">Отказ</Link>
          <button type="submit" className="btn btn-primary" disabled={saving || warehouses.length === 0}>{saving ? "Записване…" : "Запази"}</button>
        </div>
      </form>
    </>
  );
}
