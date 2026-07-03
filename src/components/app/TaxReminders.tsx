"use client";

import { useEffect, useState } from "react";
import { confirmDelete } from "@/lib/confirmDelete";
import { reminderStatus, PRIORITY_META } from "@/lib/reminderColor";
import { UiIcon } from "@/components/app/NavIcons";

type Reminder = { id: string; title: string; dueDate: string; done: boolean; priority: string; progress: number; note: string | null };

export function TaxReminders() {
  const [items, setItems] = useState<Reminder[]>([]);
  const [f, setF] = useState({ title: "", dueDate: "", priority: "normal", note: "" });
  const [editId, setEditId] = useState<string | null>(null);
  const [ef, setEf] = useState({ title: "", dueDate: "", priority: "normal", progress: 0, note: "" });

  async function load() { const r = await fetch("/api/tax-reminders"); if (r.ok) setItems(await r.json()); }
  useEffect(() => { load(); }, []);

  async function add() {
    if (!f.title.trim() || !f.dueDate) return;
    const res = await fetch("/api/tax-reminders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(f) });
    if (res.ok) { setF({ title: "", dueDate: "", priority: "normal", note: "" }); load(); }
  }
  async function patch(id: string, body: Record<string, unknown>) {
    await fetch("/api/tax-reminders", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, ...body }) });
    load();
  }
  async function remove(id: string) {
    if (!(await confirmDelete("това напомняне"))) return;
    await fetch(`/api/tax-reminders?id=${id}`, { method: "DELETE" });
    setItems((p) => p.filter((x) => x.id !== id));
  }
  function startEdit(r: Reminder) {
    setEditId(r.id);
    setEf({ title: r.title, dueDate: r.dueDate.slice(0, 10), priority: r.priority, progress: r.progress, note: r.note ?? "" });
  }
  async function saveEdit() {
    if (!editId) return;
    await patch(editId, ef);
    setEditId(null);
  }

  return (
    <div className="glass panel" style={{ padding: "18px 22px" }}>
      <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 15, margin: "0 0 4px" }}>Мои напомняния и задачи</h3>
      <p style={{ fontSize: 11.5, color: "var(--muted)", margin: "0 0 12px" }}>Важни срокове и задачи (ГФО, корпоративен данък и др.). Цветът се променя, когато срокът наближава.</p>
      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap", alignItems: "flex-end" }}>
        <div style={{ flex: 2, minWidth: 180 }}><label style={{ fontSize: 11 }}>Задача</label><input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="Напр. Подаване на ГФО" style={{ padding: "7px 10px", fontSize: 13 }} /></div>
        <div><label style={{ fontSize: 11 }}>Срок</label><input type="date" value={f.dueDate} onChange={(e) => setF({ ...f, dueDate: e.target.value })} style={{ padding: "7px 10px", fontSize: 13 }} /></div>
        <div><label style={{ fontSize: 11 }}>Приоритет</label><select value={f.priority} onChange={(e) => setF({ ...f, priority: e.target.value })} style={{ padding: "7px 8px", fontSize: 13 }}>{Object.entries(PRIORITY_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></div>
        <button className="btn btn-primary btn-sm" onClick={add}>+ Добави</button>
      </div>
      {items.length === 0 ? (
        <div style={{ fontSize: 12.5, color: "var(--muted)" }}>Няма собствени напомняния.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {items.map((r) => {
            const st = reminderStatus(r.dueDate, r.done);
            const pr = PRIORITY_META[r.priority] ?? PRIORITY_META.normal;
            if (editId === r.id) {
              return (
                <div key={r.id} style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "rgba(255,255,255,.5)" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 8, marginBottom: 8 }}>
                    <input value={ef.title} onChange={(e) => setEf({ ...ef, title: e.target.value })} style={{ padding: "6px 9px", fontSize: 12.5 }} />
                    <input type="date" value={ef.dueDate} onChange={(e) => setEf({ ...ef, dueDate: e.target.value })} style={{ padding: "6px 9px", fontSize: 12.5 }} />
                    <select value={ef.priority} onChange={(e) => setEf({ ...ef, priority: e.target.value })} style={{ padding: "6px 8px", fontSize: 12.5 }}>{Object.entries(PRIORITY_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                    <label style={{ fontSize: 11, color: "var(--muted)" }}>Изпълнение: {ef.progress}%</label>
                    <input type="range" min={0} max={100} step={5} value={ef.progress} onChange={(e) => setEf({ ...ef, progress: Number(e.target.value) })} style={{ flex: 1 }} />
                  </div>
                  <input value={ef.note} onChange={(e) => setEf({ ...ef, note: e.target.value })} placeholder="Бележка (по избор)" style={{ padding: "6px 9px", fontSize: 12.5, marginBottom: 8 }} />
                  <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => setEditId(null)}>Отказ</button>
                    <button className="btn btn-primary btn-sm" onClick={saveEdit}>Запази</button>
                  </div>
                </div>
              );
            }
            return (
              <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, padding: "7px 0", borderBottom: "1px solid rgba(217,215,200,.4)" }}>
                <input type="checkbox" checked={r.done} onChange={() => patch(r.id, { done: !r.done, progress: !r.done ? 100 : 0 })} style={{ width: "auto" }} />
                <span style={{ width: 4, height: 22, borderRadius: 2, background: pr.color, flexShrink: 0 }} title={`Приоритет: ${pr.label}`} />
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ textDecoration: r.done ? "line-through" : "none", color: r.done ? "var(--muted)" : "inherit", fontWeight: 500 }}>{r.title}</span>
                  {!r.done && r.progress > 0 && r.progress < 100 && (
                    <span style={{ display: "block", height: 4, background: "rgba(217,215,200,.5)", borderRadius: 2, marginTop: 4, maxWidth: 160 }}><span style={{ display: "block", height: "100%", width: `${r.progress}%`, background: "var(--emerald)", borderRadius: 2 }} /></span>
                  )}
                  {r.note && <span style={{ display: "block", fontSize: 11, color: "var(--muted)" }}>{r.note}</span>}
                </span>
                <span style={{ fontSize: 11, fontWeight: 700, color: st.color, background: st.bg, borderRadius: 12, padding: "2px 9px", whiteSpace: "nowrap" }}>{st.label}</span>
                <span className="num" style={{ fontSize: 11.5, color: "var(--muted)" }}>{new Date(r.dueDate).toLocaleDateString("bg-BG")}</span>
                <button onClick={() => startEdit(r)} title="Редактирай" style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", display: "inline-flex" }}><UiIcon.edit width={14} height={14} /></button>
                <button onClick={() => remove(r.id)} title="Изтрий" style={{ background: "none", border: "none", color: "var(--brick)", cursor: "pointer" }}>×</button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
