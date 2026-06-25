"use client";

import { useState } from "react";

type TD = {
  id: string; productName: string; ingredients: string | null; preparation: string | null;
  bakingTime: string | null; bakingTemp: string | null; cooling: string | null;
  storage: string | null; shelfLife: string | null; notes: string | null;
};

const empty = { productName: "", ingredients: "", preparation: "", bakingTime: "", bakingTemp: "", cooling: "", storage: "", shelfLife: "", notes: "" };

export function HaccpPanel({ initial }: { initial: TD[] }) {
  const [docs, setDocs] = useState<TD[]>(initial);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState<typeof empty>(empty);
  const [error, setError] = useState("");

  function startAdd() { setForm(empty); setEditing(null); setShowForm(true); setError(""); }
  function startEdit(d: TD) {
    setForm({
      productName: d.productName, ingredients: d.ingredients ?? "", preparation: d.preparation ?? "",
      bakingTime: d.bakingTime ?? "", bakingTemp: d.bakingTemp ?? "", cooling: d.cooling ?? "",
      storage: d.storage ?? "", shelfLife: d.shelfLife ?? "", notes: d.notes ?? "",
    });
    setEditing(d.id); setShowForm(true); setError("");
  }
  async function reload() { const r = await fetch("/api/technological-docs"); if (r.ok) setDocs(await r.json()); }
  async function save() {
    setError("");
    const res = await fetch(editing ? `/api/technological-docs/${editing}` : "/api/technological-docs", {
      method: editing ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
    });
    if (res.ok) { setShowForm(false); reload(); } else setError((await res.json()).error ?? "Грешка.");
  }
  async function remove(id: string) {
    if (!confirm("Изтриване на документа?")) return;
    const res = await fetch(`/api/technological-docs/${id}`, { method: "DELETE" });
    if (res.ok) setDocs((d) => d.filter((x) => x.id !== id));
  }

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
        <div>
          <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 25, fontWeight: 600, margin: "0 0 3px" }}>HACCP — Безопасност на храните</h1>
          <div style={{ color: "var(--muted)", fontSize: 13 }}>Технологична документация (ТД) и изисквания по системата за управление на безопасността на храните</div>
        </div>
        <button className="btn btn-primary" onClick={startAdd}>+ Нова ТД</button>
      </div>

      {/* Информация за HACCP/БАБХ */}
      <div className="glass panel" style={{ padding: "16px 20px", marginBottom: 16, borderLeft: "4px solid var(--emerald)" }}>
        <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 14, margin: "0 0 8px" }}>Изисквания по HACCP (БАБХ)</h3>
        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, color: "var(--ink-soft)", lineHeight: 1.7 }}>
          <li>Анализ на опасностите (биологични, химични, физични) по етапи на процеса</li>
          <li>Определяне на критични контролни точки (ККТ) и критични граници</li>
          <li>Мониторинг на ККТ и водене на записи</li>
          <li>Коригиращи действия при отклонения</li>
          <li>Процедури за проверка (верификация) и вътрешни одити</li>
          <li>Добри производствени и хигиенни практики (ДПП/ДХП), проследяемост на партидите</li>
          <li>Технологична документация за всеки продукт (рецептура, режими, съхранение)</li>
        </ul>
      </div>

      {showForm && (
        <div className="glass panel" style={{ padding: 24, marginBottom: 16 }}>
          <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 15, margin: "0 0 14px" }}>{editing ? "Редакция на ТД" : "Нова технологична документация"}</h3>
          {error && <div style={{ background: "var(--brick-soft)", color: "var(--brick)", borderRadius: 6, padding: "8px 12px", fontSize: 12.5, marginBottom: 12 }}>{error}</div>}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px,1fr))", gap: 12 }}>
            <div style={{ gridColumn: "1 / -1" }}><label>Наименование на продукта *</label><input value={form.productName} onChange={(e) => setForm({ ...form, productName: e.target.value })} /></div>
            <div style={{ gridColumn: "1 / -1" }}><label>Съставки / Продукти</label><textarea rows={3} value={form.ingredients} onChange={(e) => setForm({ ...form, ingredients: e.target.value })} placeholder="Брашно, вода, мая, сол…" /></div>
            <div style={{ gridColumn: "1 / -1" }}><label>Начин на приготвяне</label><textarea rows={4} value={form.preparation} onChange={(e) => setForm({ ...form, preparation: e.target.value })} /></div>
            <div><label>Време на изпичане</label><input value={form.bakingTime} onChange={(e) => setForm({ ...form, bakingTime: e.target.value })} placeholder="напр. 25 мин" /></div>
            <div><label>Температура на изпичане</label><input value={form.bakingTemp} onChange={(e) => setForm({ ...form, bakingTemp: e.target.value })} placeholder="напр. 220°C" /></div>
            <div><label>Охлаждане</label><input value={form.cooling} onChange={(e) => setForm({ ...form, cooling: e.target.value })} placeholder="напр. до 20°C за 2 ч" /></div>
            <div><label>Съхранение</label><input value={form.storage} onChange={(e) => setForm({ ...form, storage: e.target.value })} placeholder="напр. 0–4°C" /></div>
            <div><label>Срок на годност</label><input value={form.shelfLife} onChange={(e) => setForm({ ...form, shelfLife: e.target.value })} placeholder="напр. 72 часа" /></div>
            <div style={{ gridColumn: "1 / -1" }}><label>Допълнителни бележки</label><textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
            <button className="btn btn-ghost btn-sm" onClick={() => setShowForm(false)}>Отказ</button>
            <button className="btn btn-primary btn-sm" onClick={save}>Запази</button>
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px,1fr))", gap: 14 }}>
        {docs.length === 0 ? (
          <div className="glass panel" style={{ gridColumn: "1 / -1", textAlign: "center", padding: "40px 0", color: "var(--muted)" }}>Няма технологична документация.</div>
        ) : docs.map((d) => (
          <div key={d.id} className="glass panel" style={{ padding: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
              <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 15, margin: 0 }}>{d.productName}</h3>
              <div style={{ display: "flex", gap: 4 }}>
                <button className="btn btn-ghost btn-sm" onClick={() => startEdit(d)}>✎</button>
                <button className="btn btn-ghost btn-sm" style={{ color: "var(--brick)" }} onClick={() => remove(d.id)}>×</button>
              </div>
            </div>
            <dl style={{ margin: 0, fontSize: 12.5, display: "grid", gridTemplateColumns: "auto 1fr", gap: "4px 10px" }}>
              {([["Изпичане", d.bakingTime], ["Температура", d.bakingTemp], ["Охлаждане", d.cooling], ["Съхранение", d.storage], ["Срок", d.shelfLife]] as [string, string | null][])
                .filter(([, v]) => v).map(([k, v]) => (
                  <div key={k} style={{ display: "contents" }}><dt style={{ color: "var(--muted)" }}>{k}</dt><dd style={{ margin: 0 }}>{v}</dd></div>
                ))}
            </dl>
            {d.ingredients && <div style={{ fontSize: 12, color: "var(--ink-soft)", marginTop: 8 }}><strong>Съставки:</strong> {d.ingredients}</div>}
          </div>
        ))}
      </div>
    </>
  );
}
