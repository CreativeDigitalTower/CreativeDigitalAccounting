"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Item = { id: string; name: string; unit: string; quantity: number };
type Ingredient = { id: string; stockItemId: string; quantity: number };
type Recipe = { id: string; name: string; outputItemId: string | null; outputQuantity: number; note: string | null; ingredients: Ingredient[] };
type Warehouse = { id: string; name: string };

export function ProductionPanel({ initialRecipes, items, warehouses }: { initialRecipes: Recipe[]; items: Item[]; warehouses: Warehouse[] }) {
  const router = useRouter();
  const [recipes, setRecipes] = useState<Recipe[]>(initialRecipes);
  const [runRecipe, setRunRecipe] = useState<Recipe | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [outputItemId, setOutputItemId] = useState("");
  const [outputQuantity, setOutputQuantity] = useState("1");
  const [note, setNote] = useState("");
  const [ings, setIngs] = useState<{ stockItemId: string; quantity: string }[]>([{ stockItemId: "", quantity: "" }]);
  const itemName = (id: string | null) => items.find((i) => i.id === id)?.name ?? "—";
  const itemUnit = (id: string | null) => items.find((i) => i.id === id)?.unit ?? "";

  async function reload() { const r = await fetch("/api/recipes"); if (r.ok) setRecipes(await r.json()); }

  async function saveRecipe() {
    setError("");
    const ingredients = ings.filter((i) => i.stockItemId && i.quantity).map((i) => ({ stockItemId: i.stockItemId, quantity: Number(i.quantity) }));
    if (!name.trim() || ingredients.length === 0) { setError("Въведете име и поне една съставка."); return; }
    const res = await fetch("/api/recipes", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, outputItemId: outputItemId || null, outputQuantity: Number(outputQuantity) || 1, note: note || null, ingredients }),
    });
    if (res.ok) {
      setShowForm(false); setName(""); setOutputItemId(""); setOutputQuantity("1"); setNote(""); setIngs([{ stockItemId: "", quantity: "" }]);
      reload();
    } else setError((await res.json()).error ?? "Грешка.");
  }

  async function deleteRecipe(id: string) {
    if (!confirm("Изтриване на рецептата?")) return;
    const res = await fetch(`/api/recipes?id=${id}`, { method: "DELETE" });
    if (res.ok) setRecipes((r) => r.filter((x) => x.id !== id));
  }

  return (
    <>
      {runRecipe && (
        <RunModal recipe={runRecipe} items={items} warehouses={warehouses} onClose={() => setRunRecipe(null)} onDone={() => { setRunRecipe(null); router.refresh(); }} />
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
        <div>
          <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 25, fontWeight: 600, margin: "0 0 3px" }}>Производство</h1>
          <div style={{ color: "var(--muted)", fontSize: 13 }}>Рецепти и производство — изписва съставките и заприходява готовата продукция</div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>+ Нова рецепта</button>
      </div>

      {showForm && (
        <div className="glass panel" style={{ padding: 24, marginBottom: 16 }}>
          <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 15, margin: "0 0 14px" }}>Нова рецепта</h3>
          {error && <div style={{ background: "var(--brick-soft)", color: "var(--brick)", borderRadius: 6, padding: "8px 12px", fontSize: 12.5, marginBottom: 12 }}>{error}</div>}
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div><label>Име на продукта/рецептата *</label><input value={name} onChange={(e) => setName(e.target.value)} placeholder="напр. Хляб бял 500г" /></div>
            <div><label>Готов продукт (склад)</label><select value={outputItemId} onChange={(e) => setOutputItemId(e.target.value)}><option value="">— без заприходяване —</option>{items.map((i) => <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>)}</select></div>
            <div><label>Добив{outputItemId ? ` (в ${items.find((i) => i.id === outputItemId)?.unit ?? ""})` : ""}</label><input type="number" step="any" value={outputQuantity} onChange={(e) => setOutputQuantity(e.target.value)} /></div>
          </div>
          <label>Съставки (от склада) *</label>
          {ings.map((ing, idx) => (
            <div key={idx} style={{ display: "flex", gap: 8, marginBottom: 6 }}>
              <select value={ing.stockItemId} onChange={(e) => setIngs(ings.map((x, i) => i === idx ? { ...x, stockItemId: e.target.value } : x))} style={{ flex: 2 }}>
                <option value="">— съставка —</option>{items.map((i) => <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>)}
              </select>
              <input type="number" step="any" placeholder={ing.stockItemId ? `к-во (${items.find((i) => i.id === ing.stockItemId)?.unit ?? ""})` : "к-во"} value={ing.quantity} onChange={(e) => setIngs(ings.map((x, i) => i === idx ? { ...x, quantity: e.target.value } : x))} style={{ flex: 1 }} />
              {ings.length > 1 && <button onClick={() => setIngs(ings.filter((_, i) => i !== idx))} style={{ background: "none", border: "none", color: "var(--brick)", cursor: "pointer" }}>×</button>}
            </div>
          ))}
          <button onClick={() => setIngs([...ings, { stockItemId: "", quantity: "" }])} style={{ fontSize: 12.5, color: "var(--navy)", background: "none", border: "1px dashed var(--border)", padding: "6px 12px", borderRadius: 6, cursor: "pointer", marginTop: 4 }}>+ Съставка</button>
          <div style={{ marginTop: 12 }}><label>Бележка</label><input value={note} onChange={(e) => setNote(e.target.value)} /></div>
          <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
            <button className="btn btn-ghost btn-sm" onClick={() => setShowForm(false)}>Отказ</button>
            <button className="btn btn-primary btn-sm" onClick={saveRecipe}>Запази рецепта</button>
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px,1fr))", gap: 14 }}>
        {recipes.length === 0 ? (
          <div className="glass panel" style={{ gridColumn: "1 / -1", textAlign: "center", padding: "40px 0", color: "var(--muted)" }}>Няма създадени рецепти.</div>
        ) : recipes.map((r) => (
          <div key={r.id} className="glass panel" style={{ padding: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 15, margin: "0 0 4px" }}>{r.name}</h3>
              <button onClick={() => deleteRecipe(r.id)} style={{ background: "none", border: "none", color: "var(--brick)", cursor: "pointer" }}>×</button>
            </div>
            <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 8 }}>Добив: {r.outputQuantity} {itemUnit(r.outputItemId)} × {itemName(r.outputItemId)}</div>
            <ul style={{ listStyle: "none", padding: 0, margin: "0 0 12px", fontSize: 12.5 }}>
              {r.ingredients.map((i) => <li key={i.id} style={{ color: "var(--ink-soft)" }}>• {itemName(i.stockItemId)} — {i.quantity} {itemUnit(i.stockItemId)}</li>)}
            </ul>
            <button className="btn btn-primary btn-sm" style={{ width: "100%", justifyContent: "center" }} onClick={() => setRunRecipe(r)}>▶ Произведи</button>
          </div>
        ))}
      </div>
    </>
  );
}

function RunModal({ recipe, items, warehouses, onClose, onDone }: {
  recipe: Recipe; items: Item[]; warehouses: Warehouse[]; onClose: () => void; onDone: () => void;
}) {
  const [multiplier, setMultiplier] = useState("1");
  const [batchNumber, setBatchNumber] = useState("");
  const [addToWarehouse, setAddToWarehouse] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const hasOutput = !!recipe.outputItemId;
  const outItem = items.find((i) => i.id === recipe.outputItemId);
  const mult = Number(multiplier) || 0;

  // полета за нов готов продукт, когато рецептата няма зададен изход
  const [oName, setOName] = useState(recipe.name);
  const [oWarehouse, setOWarehouse] = useState(warehouses[0]?.id ?? "");
  const [oUnit, setOUnit] = useState("бр.");
  const [oQty, setOQty] = useState(String(recipe.outputQuantity || 1));
  const [oCost, setOCost] = useState("");

  async function submit() {
    setError("");
    if (!mult || mult <= 0) { setError("Въведете валиден множител."); return; }
    const body: Record<string, unknown> = { recipeId: recipe.id, multiplier: mult, batchNumber: batchNumber || null, addToWarehouse };
    if (addToWarehouse && !hasOutput) {
      if (!oName.trim() || !oWarehouse || !oUnit.trim() || !(Number(oQty) > 0)) { setError("Попълнете данните за заприходяване (склад, име, мярка, количество)."); return; }
      body.output = { name: oName.trim(), warehouseId: oWarehouse, unit: oUnit.trim(), quantity: Number(oQty), unitCost: oCost ? Number(oCost) : undefined };
    }
    setBusy(true);
    const res = await fetch("/api/production/run", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    setBusy(false);
    if (res.ok) onDone();
    else setError((await res.json()).error ?? "Грешка при производство.");
  }

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()} className="glass panel" style={{ width: 460, maxWidth: "100%", padding: 24, maxHeight: "90vh", overflowY: "auto" }}>
        <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 17, margin: "0 0 14px" }}>Производство: {recipe.name}</h3>
        {error && <div style={{ background: "var(--brick-soft)", color: "var(--brick)", borderRadius: 6, padding: "8px 12px", fontSize: 12.5, marginBottom: 12 }}>{error}</div>}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
          <div><label style={{ fontSize: 12 }}>Множител (брой партиди) *</label><input type="number" step="any" value={multiplier} onChange={(e) => setMultiplier(e.target.value)} /></div>
          <div><label style={{ fontSize: 12 }}>Партиден номер</label><input value={batchNumber} onChange={(e) => setBatchNumber(e.target.value)} placeholder="по избор" /></div>
        </div>

        <label style={{ display: "flex", gap: 9, alignItems: "flex-start", fontSize: 13.5, margin: "0 0 12px", cursor: "pointer" }}>
          <input type="checkbox" checked={addToWarehouse} onChange={(e) => setAddToWarehouse(e.target.checked)} style={{ width: "auto", marginTop: 3 }} />
          <span>Заприходи готовата продукция в склада
            <span style={{ display: "block", fontSize: 11.5, color: "var(--muted)" }}>Ако е изключено, само се изписват вложените съставки.</span>
          </span>
        </label>

        {addToWarehouse && (hasOutput ? (
          <div style={{ fontSize: 12.5, color: "var(--ink-soft)", background: "rgba(15,138,106,.06)", borderRadius: 8, padding: "10px 12px", marginBottom: 12 }}>
            Ще се заприходят <strong>{(recipe.outputQuantity * mult) || 0} {outItem?.unit ?? ""}</strong> от „{outItem?.name ?? "—"}“.
          </div>
        ) : (
          <div style={{ border: "1px dashed var(--border)", borderRadius: 8, padding: 12, marginBottom: 12 }}>
            <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 8 }}>Рецептата няма зададен готов продукт — попълнете данни за новия складов артикул:</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div style={{ gridColumn: "1 / -1" }}><label style={{ fontSize: 12 }}>Наименование *</label><input value={oName} onChange={(e) => setOName(e.target.value)} /></div>
              <div><label style={{ fontSize: 12 }}>Склад *</label><select value={oWarehouse} onChange={(e) => setOWarehouse(e.target.value)}>{warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}</select></div>
              <div><label style={{ fontSize: 12 }}>Мярка *</label><input value={oUnit} onChange={(e) => setOUnit(e.target.value)} placeholder="бр. / кг / л" /></div>
              <div><label style={{ fontSize: 12 }}>Количество *</label><input type="number" step="any" value={oQty} onChange={(e) => setOQty(e.target.value)} /></div>
              <div><label style={{ fontSize: 12 }}>Ед. цена (€)</label><input type="number" step="any" value={oCost} onChange={(e) => setOCost(e.target.value)} placeholder="по избор" /></div>
            </div>
          </div>
        ))}

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 6 }}>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>Отказ</button>
          <button className="btn btn-primary btn-sm" disabled={busy} onClick={submit}>{busy ? "Записване…" : "▶ Произведи"}</button>
        </div>
      </div>
    </div>
  );
}
