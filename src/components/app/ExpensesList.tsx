"use client";
import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { formatCurrency } from "@/lib/constants";
import { AttachmentCell } from "@/components/app/AttachmentCell";

export type ExpenseRow = {
  id: string; description: string; category: string; categoryId: string; supplier: string | null; supplierId: string | null;
  date: string; amount: number; vatAmount: number; source: string; isRecurring: boolean; hasFile: boolean;
};
type Cat = { id: string; name: string };
type Sup = { id: string; name: string };

const MONTHS = ["Януари", "Февруари", "Март", "Април", "Май", "Юни", "Юли", "Август", "Септември", "Октомври", "Ноември", "Декември"];

export function ExpensesList({ expenses, categories, suppliers, dual, toBGNRate }: {
  expenses: ExpenseRow[]; categories: Cat[]; suppliers: Sup[]; dual: boolean; toBGNRate: number;
}) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "recurring" | "single">("all");
  const [edit, setEdit] = useState<ExpenseRow | null>(null);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return expenses.filter((e) => {
      if (filter === "recurring" && !e.isRecurring) return false;
      if (filter === "single" && e.isRecurring) return false;
      if (!term) return true;
      return [e.description, e.category, e.supplier].filter(Boolean).some((v) => v!.toLowerCase().includes(term));
    });
  }, [expenses, q, filter, ]);

  // Групиране по година → месец
  const groups = useMemo(() => {
    const map = new Map<string, ExpenseRow[]>();
    for (const e of filtered) {
      const d = new Date(e.date);
      const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, "0")}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(e);
    }
    return [...map.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [filtered]);

  const recurringCount = expenses.filter((e) => e.isRecurring).length;

  return (
    <>
      <div className="glass panel" style={{ padding: "12px 16px", marginBottom: 14, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <input placeholder="Търси разход, категория, доставчик…" value={q} onChange={(e) => setQ(e.target.value)} style={{ flex: "1 1 260px", minWidth: 200, padding: "8px 12px" }} />
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
          <button className={`filter-tab${filter === "all" ? " active" : ""}`} onClick={() => setFilter("all")}>Всички ({expenses.length})</button>
          <button className={`filter-tab${filter === "recurring" ? " active" : ""}`} onClick={() => setFilter("recurring")}>Повтарящи се ({recurringCount})</button>
          <button className={`filter-tab${filter === "single" ? " active" : ""}`} onClick={() => setFilter("single")}>Единични ({expenses.length - recurringCount})</button>
        </div>
      </div>

      {groups.length === 0 ? (
        <div className="glass panel" style={{ textAlign: "center", padding: "40px 0", color: "var(--muted)" }}>Няма разходи по този критерий.</div>
      ) : groups.map(([key, rows]) => {
        const [y, m] = key.split("-");
        const sum = rows.reduce((s, e) => s + e.amount, 0);
        return (
          <div key={key} style={{ marginBottom: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", margin: "0 0 8px" }}>
              <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 15, margin: 0 }}>{MONTHS[Number(m)]} {y}</h3>
              <span className="num" style={{ fontSize: 13, color: "var(--muted)" }}>Общо: <strong>{formatCurrency(sum)}</strong></span>
            </div>
            <div className="glass panel" style={{ padding: "8px 0" }}>
              <table>
                <thead><tr><th>Описание</th><th>Категория</th><th>Тип</th><th>Доставчик</th><th>Дата</th><th className="num">Бруто</th><th>Файл</th><th></th></tr></thead>
                <tbody>
                  {rows.map((e) => (
                    <tr key={e.id}>
                      <td style={{ fontWeight: 600 }}>{e.description}</td>
                      <td><span style={{ background: "var(--navy-soft)", color: "var(--navy)", borderRadius: 20, padding: "3px 10px", fontSize: 12, fontWeight: 600 }}>{e.category}</span></td>
                      <td>{e.isRecurring
                        ? <span style={{ fontSize: 11, fontWeight: 700, color: "#fff", background: "var(--brass)", borderRadius: 12, padding: "2px 9px" }}>Месечен</span>
                        : <span style={{ fontSize: 11.5, color: "var(--muted)" }}>Единичен</span>}</td>
                      <td style={{ fontSize: 13, color: "var(--ink-soft)" }}>{e.supplier ?? "—"}</td>
                      <td style={{ fontSize: 13, color: "var(--ink-soft)" }}>{new Date(e.date).toLocaleDateString("bg-BG")}</td>
                      <td className="num" style={{ fontWeight: 600 }}>{formatCurrency(e.amount)}{dual && <div style={{ fontSize: 10.5, color: "var(--muted)" }}>≈ {formatCurrency(e.amount * toBGNRate, "BGN")}</div>}</td>
                      <td><AttachmentCell endpoint={`/api/expenses/${e.id}`} hasFile={e.hasFile} maxMB={3} /></td>
                      <td><button className="btn btn-ghost btn-sm" onClick={() => setEdit(e)}>✎</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}

      {edit && <EditModal expense={edit} categories={categories} suppliers={suppliers} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); router.refresh(); }} />}
    </>
  );
}

function EditModal({ expense, categories, suppliers, onClose, onSaved }: {
  expense: ExpenseRow; categories: Cat[]; suppliers: Sup[]; onClose: () => void; onSaved: () => void;
}) {
  const [f, setF] = useState({
    description: expense.description, amount: String(expense.amount), vatAmount: String(expense.vatAmount),
    date: expense.date.slice(0, 10), categoryId: expense.categoryId, supplierId: expense.supplierId ?? "", isRecurring: expense.isRecurring,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    setBusy(true); setError("");
    const res = await fetch(`/api/expenses/${expense.id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        description: f.description, amount: Number(f.amount), vatAmount: Number(f.vatAmount) || 0,
        date: f.date, categoryId: f.categoryId, supplierId: f.supplierId || null, isRecurring: f.isRecurring,
      }),
    });
    setBusy(false);
    if (res.ok) onSaved(); else setError((await res.json()).error ?? "Грешка при запис.");
  }
  async function del() {
    if (!confirm("Изтриване на разхода?")) return;
    setBusy(true);
    const res = await fetch(`/api/expenses/${expense.id}`, { method: "DELETE" });
    setBusy(false);
    if (res.ok) onSaved();
  }

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()} className="glass panel" style={{ width: 460, maxWidth: "100%", padding: 24, borderRadius: 14, maxHeight: "90vh", overflowY: "auto" }}>
        <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 17, margin: "0 0 14px" }}>Редакция на разход</h3>
        {error && <div style={{ background: "var(--brick-soft)", color: "var(--brick)", borderRadius: 8, padding: "8px 12px", fontSize: 12.5, marginBottom: 12 }}>{error}</div>}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div style={{ gridColumn: "1 / -1" }}><label style={{ fontSize: 12 }}>Описание</label><input value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></div>
          <div><label style={{ fontSize: 12 }}>Бруто сума (€)</label><input type="number" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} /></div>
          <div><label style={{ fontSize: 12 }}>ДДС сума (€)</label><input type="number" value={f.vatAmount} onChange={(e) => setF({ ...f, vatAmount: e.target.value })} /></div>
          <div><label style={{ fontSize: 12 }}>Дата</label><input type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></div>
          <div><label style={{ fontSize: 12 }}>Категория</label><select value={f.categoryId} onChange={(e) => setF({ ...f, categoryId: e.target.value })}>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
          <div><label style={{ fontSize: 12 }}>Доставчик</label><select value={f.supplierId} onChange={(e) => setF({ ...f, supplierId: e.target.value })}><option value="">— Без —</option>{suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
          <label style={{ gridColumn: "1 / -1", display: "flex", gap: 8, alignItems: "center", fontSize: 13, fontWeight: 400 }}>
            <input type="checkbox" checked={f.isRecurring} onChange={(e) => setF({ ...f, isRecurring: e.target.checked })} style={{ width: "auto" }} /> Повтарящ се месечен разход
          </label>
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "space-between", marginTop: 16 }}>
          <button className="btn btn-ghost btn-sm" style={{ color: "var(--brick)" }} disabled={busy} onClick={del}>Изтрий</button>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-ghost btn-sm" onClick={onClose}>Отказ</button>
            <button className="btn btn-primary btn-sm" disabled={busy} onClick={save}>{busy ? "Запис…" : "Запази"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
