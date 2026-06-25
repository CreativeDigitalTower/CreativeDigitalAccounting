"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Item = { id: string; name: string; unit: string; quantity: number };
type Ingredient = { id: string; stockItemId: string; quantity: number };
type Recipe = { id: string; name: string; outputItemId: string | null; outputQuantity: number; note: string | null; ingredients: Ingredient[] };

export function ProductionPanel({ initialRecipes, items }: { initialRecipes: Recipe[]; items: Item[] }) {
  const router = useRouter();
  const [recipes, setRecipes] = useState<Recipe[]>(initialRecipes);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [outputItemId, setOutputItemId] = useState("");
  const [outputQuantity, setOutputQuantity] = useState("1");
  const [note, setNote] = useState("");
  const [ings, setIngs] = useState<{ stockItemId: string; quantity: string }[]>([{ stockItemId: "", quantity: "" }]);
  const itemName = (id: string | null) => items.find((i) => i.id === id)?.name ?? "—";

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

  async function run(recipe: Recipe) {
    const mStr = prompt(`Колко пъти да се произведе „${recipe.name}"? (множител)`, "1");
    if (mStr == null) return;
    const multiplier = Number(mStr);
    if (!multiplier || multiplier <= 0) return;
    const batchNumber = prompt("Партиден номер на готовата продукция (по избор):", "") || null;
    const res = await fetch("/api/production/run", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recipeId: recipe.id, multiplier, batchNumber }),
    });
    if (res.ok) { alert("Производството е записано. Складът е обновен."); router.refresh(); }
    else alert((await res.json()).error ?? "Грешка при производство.");
  }

  return (
    <>
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
            <div><label>Готов продукт (склад)</label><select value={outputItemId} onChange={(e) => setOutputItemId(e.target.value)}><option value="">— без заприходяване —</option>{items.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}</select></div>
            <div><label>Добив (бройки)</label><input type="number" step="any" value={outputQuantity} onChange={(e) => setOutputQuantity(e.target.value)} /></div>
          </div>
          <label>Съставки (от склада) *</label>
          {ings.map((ing, idx) => (
            <div key={idx} style={{ display: "flex", gap: 8, marginBottom: 6 }}>
              <select value={ing.stockItemId} onChange={(e) => setIngs(ings.map((x, i) => i === idx ? { ...x, stockItemId: e.target.value } : x))} style={{ flex: 2 }}>
                <option value="">— съставка —</option>{items.map((i) => <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>)}
              </select>
              <input type="number" step="any" placeholder="к-во" value={ing.quantity} onChange={(e) => setIngs(ings.map((x, i) => i === idx ? { ...x, quantity: e.target.value } : x))} style={{ flex: 1 }} />
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
            <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 8 }}>Добив: {r.outputQuantity} × {itemName(r.outputItemId)}</div>
            <ul style={{ listStyle: "none", padding: 0, margin: "0 0 12px", fontSize: 12.5 }}>
              {r.ingredients.map((i) => <li key={i.id} style={{ color: "var(--ink-soft)" }}>• {itemName(i.stockItemId)} — {i.quantity}</li>)}
            </ul>
            <button className="btn btn-primary btn-sm" style={{ width: "100%", justifyContent: "center" }} onClick={() => run(r)}>▶ Произведи</button>
          </div>
        ))}
      </div>
    </>
  );
}
