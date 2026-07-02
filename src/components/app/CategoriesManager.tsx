"use client";

import { useState } from "react";
import { confirmDelete } from "@/lib/confirmDelete";

type Cat = { id: string; name: string };

export function CategoriesManager({ initial }: { initial: Cat[] }) {
  const [cats, setCats] = useState<Cat[]>(initial);
  const [name, setName] = useState("");
  const [open, setOpen] = useState(false);

  async function add() {
    if (!name.trim()) return;
    const res = await fetch("/api/stock-categories", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }),
    });
    if (res.ok) { setCats([...cats, await res.json()]); setName(""); }
  }
  async function remove(id: string) {
    if (!(await confirmDelete("тази категория"))) return;
    const res = await fetch(`/api/stock-categories?id=${id}`, { method: "DELETE" });
    if (res.ok) setCats(cats.filter((c) => c.id !== id));
  }

  return (
    <div className="glass panel" style={{ padding: "14px 18px", marginBottom: 16 }}>
      <button onClick={() => setOpen(!open)} style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "'Fraunces', serif", fontSize: 14, fontWeight: 600 }}>
        {open ? "▼" : "▶"} Категории на склада ({cats.length})
      </button>
      {open && (
        <div style={{ marginTop: 12 }}>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
            {cats.length === 0 && <span style={{ fontSize: 12.5, color: "var(--muted)" }}>Няма категории. Създайте, за да систематизирате артикулите.</span>}
            {cats.map((c) => (
              <span key={c.id} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "var(--navy-soft)", borderRadius: 16, padding: "4px 10px", fontSize: 12.5 }}>
                {c.name}
                <button onClick={() => remove(c.id)} style={{ background: "none", border: "none", color: "var(--brick)", cursor: "pointer", fontSize: 14, lineHeight: 1 }}>×</button>
              </span>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8, maxWidth: 360 }}>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Нова категория (напр. Суровини)" onKeyDown={(e) => e.key === "Enter" && add()} style={{ padding: "7px 10px", fontSize: 13 }} />
            <button className="btn btn-primary btn-sm" onClick={add}>Добави</button>
          </div>
        </div>
      )}
    </div>
  );
}
