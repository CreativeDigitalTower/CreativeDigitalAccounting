"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Item = { id: string; name: string; unit: string; quantity: number };
type Warehouse = { id: string; name: string };
type NewItem = { name: string; unit: string; warehouseId: string; qty: string; unitCost: string };

export function RevisionForm({ items, warehouses }: { items: Item[]; warehouses: Warehouse[] }) {
  const router = useRouter();
  const [counts, setCounts] = useState<Record<string, string>>({});
  const [newItems, setNewItems] = useState<NewItem[]>([]);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function addNew() { setNewItems((p) => [...p, { name: "", unit: "бр", warehouseId: warehouses[0]?.id ?? "", qty: "", unitCost: "" }]); }
  function updNew(i: number, k: keyof NewItem, v: string) { setNewItems((p) => p.map((x, j) => j === i ? { ...x, [k]: v } : x)); }
  function delNew(i: number) { setNewItems((p) => p.filter((_, j) => j !== i)); }

  async function apply() {
    setError("");
    const lines = items
      .filter((i) => counts[i.id] !== undefined && counts[i.id] !== "")
      .map((i) => ({ stockItemId: i.id, countedQty: Number(counts[i.id]) }));

    const validNew = newItems.filter((n) => n.name.trim() && n.warehouseId && n.qty !== "");
    if (lines.length === 0 && validNew.length === 0) { setError("Въведете поне една преброена бройка или нов артикул."); return; }
    setSaving(true);

    // Създаваме новооткритите артикули (с наличност 0), после ги включваме в ревизията
    for (const n of validNew) {
      const cRes = await fetch("/api/warehouse/items", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ warehouseId: n.warehouseId, name: n.name.trim(), unit: n.unit || "бр", quantity: 0, unitCost: n.unitCost ? Number(n.unitCost) : null }),
      });
      if (cRes.ok) { const created = await cRes.json(); lines.push({ stockItemId: created.id, countedQty: Number(n.qty) }); }
      else { setSaving(false); setError("Грешка при създаване на нов артикул."); return; }
    }

    const res = await fetch("/api/warehouse/stocktake", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note: note || null, lines }),
    });
    setSaving(false);
    if (res.ok) router.push("/dashboard/warehouse");
    else setError((await res.json()).error ?? "Грешка при запис.");
  }

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16 }}>
        <Link href="/dashboard/warehouse" style={{ color: "var(--muted)", textDecoration: "none", fontSize: 13 }}>← Склад</Link>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 600, margin: 0 }}>Ревизия (инвентаризация)</h1>
      </div>
      <p style={{ fontSize: 13, color: "var(--ink-soft)", marginBottom: 16 }}>
        Въведете реално преброените количества. При запис складовите наличности се обновяват автоматично, а разликите се записват като движение „ревизия".
      </p>
      {error && <div style={{ background: "var(--brick-soft)", border: "1px solid var(--brick)", color: "var(--brick)", borderRadius: 8, padding: "10px 14px", fontSize: 13, marginBottom: 16 }}>{error}</div>}

      <div className="glass panel" style={{ padding: "8px 0", marginBottom: 16 }}>
        {items.length === 0 ? (
          <div style={{ padding: "32px", color: "var(--muted)", fontSize: 13 }}>Няма артикули в склада.</div>
        ) : (
          <table>
            <thead><tr><th>Артикул</th><th className="num">По система</th><th className="num">Преброено</th><th className="num">Разлика</th></tr></thead>
            <tbody>
              {items.map((i) => {
                const counted = counts[i.id];
                const diff = counted !== undefined && counted !== "" ? Number(counted) - i.quantity : null;
                return (
                  <tr key={i.id}>
                    <td style={{ fontWeight: 600 }}>{i.name} <span style={{ color: "var(--muted)", fontWeight: 400, fontSize: 12 }}>({i.unit})</span></td>
                    <td className="num">{i.quantity}</td>
                    <td className="num" style={{ width: 120 }}>
                      <input type="number" step="any" value={counted ?? ""} onChange={(e) => setCounts({ ...counts, [i.id]: e.target.value })}
                        style={{ padding: "5px 8px", fontSize: 13, textAlign: "right", width: 100 }} placeholder="—" />
                    </td>
                    <td className="num" style={{ color: diff == null ? "var(--muted)" : diff === 0 ? "var(--ink-soft)" : diff > 0 ? "var(--emerald-dark)" : "var(--brick)" }}>
                      {diff == null ? "—" : diff > 0 ? `+${diff}` : diff}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Новооткрити артикули по време на ревизията */}
      <div className="glass panel" style={{ padding: 16, marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: newItems.length ? 12 : 0, flexWrap: "wrap", gap: 8 }}>
          <div>
            <div style={{ fontFamily: "'Fraunces', serif", fontSize: 14, fontWeight: 600 }}>Новооткрити артикули</div>
            <div style={{ fontSize: 12, color: "var(--muted)" }}>Ако намерите продукт, който не е в системата — впишете го тук и той ще се добави в склада.</div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={addNew} disabled={warehouses.length === 0}>+ Нов артикул</button>
        </div>
        {newItems.map((n, i) => (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr auto", gap: 8, marginBottom: 8, alignItems: "center" }}>
            <input placeholder="Наименование" value={n.name} onChange={(e) => updNew(i, "name", e.target.value)} style={{ padding: "6px 8px", fontSize: 12.5 }} />
            <select value={n.warehouseId} onChange={(e) => updNew(i, "warehouseId", e.target.value)} style={{ padding: "6px 8px", fontSize: 12.5 }}>{warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}</select>
            <input placeholder="Мярка" value={n.unit} onChange={(e) => updNew(i, "unit", e.target.value)} style={{ padding: "6px 8px", fontSize: 12.5 }} />
            <input type="number" placeholder="Количество" value={n.qty} onChange={(e) => updNew(i, "qty", e.target.value)} style={{ padding: "6px 8px", fontSize: 12.5, textAlign: "right" }} />
            <input type="number" placeholder="Ед. цена €" value={n.unitCost} onChange={(e) => updNew(i, "unitCost", e.target.value)} style={{ padding: "6px 8px", fontSize: 12.5, textAlign: "right" }} />
            <button onClick={() => delNew(i)} style={{ background: "none", border: "none", color: "var(--brick)", cursor: "pointer", fontSize: 16 }}>×</button>
          </div>
        ))}
      </div>

      <div className="glass panel" style={{ padding: 16, marginBottom: 16 }}>
        <label>Бележка към ревизията</label>
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="напр. месечна инвентаризация" />
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
        <Link href="/dashboard/warehouse" className="btn btn-ghost">Отказ</Link>
        <button className="btn btn-primary" onClick={apply} disabled={saving}>{saving ? "Прилагане…" : "Приложи ревизията"}</button>
      </div>
    </>
  );
}
