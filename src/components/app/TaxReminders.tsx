"use client";

import { useEffect, useState } from "react";

type Reminder = { id: string; title: string; dueDate: string; done: boolean };

export function TaxReminders() {
  const [items, setItems] = useState<Reminder[]>([]);
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");

  async function load() { const r = await fetch("/api/tax-reminders"); if (r.ok) setItems(await r.json()); }
  useEffect(() => { load(); }, []);

  async function add() {
    if (!title.trim() || !dueDate) return;
    const res = await fetch("/api/tax-reminders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title, dueDate }) });
    if (res.ok) { setTitle(""); setDueDate(""); load(); }
  }
  async function toggle(r: Reminder) {
    await fetch("/api/tax-reminders", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: r.id, done: !r.done }) });
    load();
  }
  async function remove(id: string) {
    await fetch(`/api/tax-reminders?id=${id}`, { method: "DELETE" });
    setItems((p) => p.filter((x) => x.id !== id));
  }

  return (
    <div className="glass panel" style={{ padding: "18px 22px" }}>
      <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 15, margin: "0 0 12px" }}>Мои напомняния</h3>
      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Напр. Плащане на ДДС" style={{ flex: 2, minWidth: 180, padding: "7px 10px", fontSize: 13 }} />
        <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} style={{ padding: "7px 10px", fontSize: 13 }} />
        <button className="btn btn-primary btn-sm" onClick={add}>+ Добави</button>
      </div>
      {items.length === 0 ? (
        <div style={{ fontSize: 12.5, color: "var(--muted)" }}>Няма собствени напомняния.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {items.map((r) => {
            const overdue = !r.done && new Date(r.dueDate) < new Date();
            return (
              <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, padding: "6px 0", borderBottom: "1px solid rgba(217,215,200,.4)" }}>
                <input type="checkbox" checked={r.done} onChange={() => toggle(r)} style={{ width: "auto" }} />
                <span style={{ flex: 1, textDecoration: r.done ? "line-through" : "none", color: r.done ? "var(--muted)" : "inherit" }}>{r.title}</span>
                <span className="num" style={{ fontSize: 12, color: overdue ? "var(--brick)" : "var(--ink-soft)" }}>{new Date(r.dueDate).toLocaleDateString("bg-BG")}</span>
                <button onClick={() => remove(r.id)} style={{ background: "none", border: "none", color: "var(--brick)", cursor: "pointer" }}>×</button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
