"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UiIcon } from "@/components/app/NavIcons";
import { confirmDelete } from "@/lib/confirmDelete";

type Item = {
  id: string; name: string; sku: string | null; unit: string;
  quantity: number; minQuantity: number | null; unitCost: number | null; expiryDate: string | null;
};

export function StockItemActions({ item }: { item: Item }) {
  const router = useRouter();
  const [edit, setEdit] = useState(false);
  const [f, setF] = useState(item);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function save() {
    setBusy(true); setErr("");
    const res = await fetch(`/api/warehouse/items/${item.id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: f.name, sku: f.sku, unit: f.unit,
        quantity: Number(f.quantity), minQuantity: f.minQuantity != null ? Number(f.minQuantity) : null,
        unitCost: f.unitCost != null ? Number(f.unitCost) : null,
        expiryDate: f.expiryDate || null,
      }),
    });
    setBusy(false);
    if (res.ok) { setEdit(false); router.refresh(); }
    else setErr((await res.json().catch(() => ({}))).error ?? "Грешка при запис.");
  }

  async function remove() {
    if (!(await confirmDelete(`артикула „${item.name}"`))) return;
    setBusy(true);
    const res = await fetch(`/api/warehouse/items/${item.id}`, { method: "DELETE" });
    setBusy(false);
    if (res.ok) router.push("/dashboard/warehouse");
    else alert((await res.json().catch(() => ({}))).error ?? "Грешка при изтриване.");
  }

  return (
    <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
      <button className="btn btn-ghost btn-sm" onClick={() => setEdit((v) => !v)} style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
        {edit ? "Затвори" : <><UiIcon.edit /> Редактирай</>}
      </button>
      <button className="btn btn-ghost btn-sm" onClick={remove} disabled={busy} title="Изтрий артикул" style={{ color: "var(--brick)", borderColor: "var(--brick)", display: "inline-flex", alignItems: "center" }}>
        <UiIcon.trash />
      </button>

      {edit && (
        <div onClick={() => setEdit(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 }}>
          <div onClick={(e) => e.stopPropagation()} className="glass panel" style={{ width: "min(520px, 100%)", padding: 22 }}>
            <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 17, margin: "0 0 14px" }}>Редакция на артикул</h3>
            {err && <div style={{ background: "var(--brick-soft)", color: "var(--brick)", borderRadius: 6, padding: "8px 12px", fontSize: 12.5, marginBottom: 12 }}>{err}</div>}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div style={{ gridColumn: "1 / -1" }}><label>Наименование</label><input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
              <div><label>SKU</label><input value={f.sku ?? ""} onChange={(e) => setF({ ...f, sku: e.target.value })} /></div>
              <div><label>Мерна единица</label><input value={f.unit} onChange={(e) => setF({ ...f, unit: e.target.value })} /></div>
              <div><label>Наличност</label><input type="number" value={f.quantity} onChange={(e) => setF({ ...f, quantity: Number(e.target.value) })} /></div>
              <div><label>Мин. наличност</label><input type="number" value={f.minQuantity ?? ""} onChange={(e) => setF({ ...f, minQuantity: e.target.value ? Number(e.target.value) : null })} /></div>
              <div><label>Ед. цена (€)</label><input type="number" value={f.unitCost ?? ""} onChange={(e) => setF({ ...f, unitCost: e.target.value ? Number(e.target.value) : null })} /></div>
              <div><label>Срок на годност</label><input type="date" value={f.expiryDate?.slice(0, 10) ?? ""} onChange={(e) => setF({ ...f, expiryDate: e.target.value })} /></div>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 16, justifyContent: "flex-end" }}>
              <button className="btn btn-ghost btn-sm" onClick={() => setEdit(false)} disabled={busy}>Отказ</button>
              <button className="btn btn-primary btn-sm" onClick={save} disabled={busy}>{busy ? "Записване…" : "Запази"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
