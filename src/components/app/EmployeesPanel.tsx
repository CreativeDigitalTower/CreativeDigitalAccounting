"use client";

import { useEffect, useState, Fragment } from "react";

type Leave = { id: string; type: string; startDate: string; endDate: string; days: number | null; note: string | null };
type Employee = {
  id: string; name: string; position: string | null; phone: string | null; email: string | null;
  address: string | null; salary: number | null; hiredAt: string | null; paidLeaveDays: number; notes: string | null; active: boolean;
  leaves?: Leave[];
};

const LEAVE_LABELS: Record<string, string> = { leave: "Платен отпуск", sick: "Болничен", unpaid: "Неплатен отпуск", other: "Друго" };
const empty = { name: "", position: "", phone: "", email: "", address: "", salary: "", hiredAt: "", paidLeaveDays: "20", notes: "" };

export function EmployeesPanel({ initial }: { initial: Employee[] }) {
  const [employees, setEmployees] = useState<Employee[]>(initial);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState<typeof empty>(empty);
  const [error, setError] = useState("");
  const [open, setOpen] = useState<string | null>(null);

  async function reload() {
    const r = await fetch("/api/employees");
    if (r.ok) {
      const list = await r.json();
      // запази leaves от текущото състояние
      setEmployees(list);
    }
  }

  function startAdd() { setForm(empty); setEditing(null); setShowForm(true); setError(""); }
  function startEdit(e: Employee) {
    setForm({
      name: e.name, position: e.position ?? "", phone: e.phone ?? "", email: e.email ?? "",
      address: e.address ?? "", salary: e.salary != null ? String(e.salary) : "", hiredAt: e.hiredAt?.slice(0, 10) ?? "",
      paidLeaveDays: String(e.paidLeaveDays ?? 20), notes: e.notes ?? "",
    });
    setEditing(e.id); setShowForm(true); setError("");
  }

  async function save() {
    setError("");
    const body = {
      ...form, salary: form.salary ? Number(form.salary) : null, hiredAt: form.hiredAt || null,
      paidLeaveDays: form.paidLeaveDays ? Number(form.paidLeaveDays) : 20,
    };
    const res = await fetch(editing ? `/api/employees/${editing}` : "/api/employees", {
      method: editing ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    if (res.ok) { setShowForm(false); reload(); }
    else setError((await res.json()).error ?? "Грешка при запис.");
  }

  async function remove(id: string) {
    if (!confirm("Изтриване на служителя?")) return;
    const res = await fetch(`/api/employees/${id}`, { method: "DELETE" });
    if (res.ok) setEmployees((e) => e.filter((x) => x.id !== id));
  }

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 25, fontWeight: 600, margin: "0 0 3px" }}>Служители</h1>
          <div style={{ color: "var(--muted)", fontSize: 13 }}>{employees.length} служители</div>
        </div>
        <button className="btn btn-primary" onClick={startAdd}>+ Нов служител</button>
      </div>

      {showForm && (
        <div className="glass panel" style={{ padding: 24, marginBottom: 16 }}>
          <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 15, margin: "0 0 14px" }}>{editing ? "Редакция" : "Нов служител"}</h3>
          {error && <div style={{ background: "var(--brick-soft)", color: "var(--brick)", borderRadius: 6, padding: "8px 12px", fontSize: 12.5, marginBottom: 12 }}>{error}</div>}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px,1fr))", gap: 12 }}>
            <div><label>Име *</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><label>Позиция</label><input value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} /></div>
            <div><label>Телефон</label><input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            <div><label>Имейл</label><input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div><label>Заплата (бруто)</label><input type="number" value={form.salary} onChange={(e) => setForm({ ...form, salary: e.target.value })} /></div>
            <div><label>Дата на назначаване</label><input type="date" value={form.hiredAt} onChange={(e) => setForm({ ...form, hiredAt: e.target.value })} /></div>
            <div><label>Годишен платен отпуск (дни)</label><input type="number" min="0" value={form.paidLeaveDays} onChange={(e) => setForm({ ...form, paidLeaveDays: e.target.value })} /></div>
            <div style={{ gridColumn: "1 / -1" }}><label>Адрес</label><input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
            <div style={{ gridColumn: "1 / -1" }}><label>Бележки</label><textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
            <button className="btn btn-ghost btn-sm" onClick={() => setShowForm(false)}>Отказ</button>
            <button className="btn btn-primary btn-sm" onClick={save}>Запази</button>
          </div>
        </div>
      )}

      <div className="glass panel" style={{ padding: "8px 0" }}>
        {employees.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px 0", color: "var(--muted)" }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🧑‍💼</div>
            <div style={{ fontSize: 14 }}>Няма въведени служители</div>
          </div>
        ) : (
          <table>
            <thead><tr><th>Име</th><th>Позиция</th><th>Телефон</th><th>Имейл</th><th className="num">Заплата</th><th></th></tr></thead>
            <tbody>
              {employees.map((e) => (
                <Fragment key={e.id}>
                  <tr>
                    <td style={{ fontWeight: 600 }}>
                      <button onClick={() => setOpen(open === e.id ? null : e.id)} style={{ background: "none", border: "none", cursor: "pointer", fontWeight: 600, fontSize: 13.5 }}>
                        {open === e.id ? "▼ " : "▶ "}{e.name}
                      </button>
                    </td>
                    <td style={{ fontSize: 13 }}>{e.position ?? "—"}</td>
                    <td style={{ fontSize: 13 }}>{e.phone ?? "—"}</td>
                    <td style={{ fontSize: 13 }}>{e.email ?? "—"}</td>
                    <td className="num">{e.salary != null ? e.salary.toFixed(2) : "—"}</td>
                    <td style={{ display: "flex", gap: 6 }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => startEdit(e)}>✎</button>
                      <button className="btn btn-ghost btn-sm" style={{ color: "var(--brick)" }} onClick={() => remove(e.id)}>Изтрий</button>
                    </td>
                  </tr>
                  {open === e.id && (
                    <tr>
                      <td colSpan={6} style={{ background: "rgba(0,0,0,.02)", padding: "14px 18px" }}>
                        <LeavePanel employee={e} />
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}

function LeavePanel({ employee }: { employee: Employee }) {
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [form, setForm] = useState({ type: "leave", startDate: "", endDate: "", note: "" });

  useEffect(() => {
    // зареждане на отпуски за служителя
    fetch(`/api/employees/${employee.id}/leaves/list`).then(async (r) => {
      if (r.ok) setLeaves(await r.json());
      setLoaded(true);
    }).catch(() => setLoaded(true));
  }, [employee.id]);

  async function add() {
    if (!form.startDate || !form.endDate) return;
    const res = await fetch(`/api/employees/${employee.id}/leaves`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
    });
    if (res.ok) { const l = await res.json(); setLeaves((p) => [l, ...p]); setForm({ type: "leave", startDate: "", endDate: "", note: "" }); }
  }
  async function del(id: string) {
    const res = await fetch(`/api/employees/${employee.id}/leaves?leaveId=${id}`, { method: "DELETE" });
    if (res.ok) setLeaves((p) => p.filter((x) => x.id !== id));
  }

  const usedPaid = leaves.filter((l) => l.type === "leave").reduce((s, l) => s + (l.days ?? 0), 0);
  const usedUnpaid = leaves.filter((l) => l.type === "unpaid").reduce((s, l) => s + (l.days ?? 0), 0);
  const totalSick = leaves.filter((l) => l.type === "sick").reduce((s, l) => s + (l.days ?? 0), 0);
  const entitlement = employee.paidLeaveDays ?? 20;
  const remaining = entitlement - usedPaid;

  return (
    <div>
      {employee.address && <div style={{ fontSize: 12.5, color: "var(--ink-soft)", marginBottom: 6 }}>Адрес: {employee.address}</div>}
      {employee.notes && <div style={{ fontSize: 12.5, color: "var(--ink-soft)", marginBottom: 10 }}>Бележки: {employee.notes}</div>}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px,1fr))", gap: 10, marginBottom: 12 }}>
        <div style={{ background: "var(--emerald-soft)", borderRadius: 8, padding: "8px 10px" }}>
          <div style={{ fontSize: 11, color: "var(--muted)" }}>Полагаем платен отпуск</div>
          <div className="num" style={{ fontSize: 16, fontWeight: 700 }}>{entitlement} дни</div>
        </div>
        <div style={{ background: "rgba(255,255,255,.5)", borderRadius: 8, padding: "8px 10px" }}>
          <div style={{ fontSize: 11, color: "var(--muted)" }}>Използван платен</div>
          <div className="num" style={{ fontSize: 16, fontWeight: 700 }}>{usedPaid} дни</div>
        </div>
        <div style={{ background: remaining < 0 ? "var(--brick-soft)" : "var(--brass-soft)", borderRadius: 8, padding: "8px 10px" }}>
          <div style={{ fontSize: 11, color: "var(--muted)" }}>Оставащ платен</div>
          <div className="num" style={{ fontSize: 16, fontWeight: 700, color: remaining < 0 ? "var(--brick)" : "var(--brass)" }}>{remaining} дни</div>
        </div>
        <div style={{ background: "rgba(255,255,255,.5)", borderRadius: 8, padding: "8px 10px" }}>
          <div style={{ fontSize: 11, color: "var(--muted)" }}>Неплатен / Болничен</div>
          <div className="num" style={{ fontSize: 14, fontWeight: 700 }}>{usedUnpaid} / {totalSick} дни</div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap", marginBottom: 10 }}>
        <div><label style={{ fontSize: 11 }}>Вид</label><select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} style={{ padding: "6px 8px", fontSize: 12.5 }}>{Object.entries(LEAVE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
        <div><label style={{ fontSize: 11 }}>От</label><input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} style={{ padding: "6px 8px", fontSize: 12.5 }} /></div>
        <div><label style={{ fontSize: 11 }}>До</label><input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} style={{ padding: "6px 8px", fontSize: 12.5 }} /></div>
        <div style={{ flex: 1, minWidth: 120 }}><label style={{ fontSize: 11 }}>Бележка</label><input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} style={{ padding: "6px 8px", fontSize: 12.5 }} /></div>
        <button className="btn btn-primary btn-sm" onClick={add}>+ Добави</button>
      </div>
      {!loaded ? <div style={{ fontSize: 12, color: "var(--muted)" }}>Зареждане…</div> : leaves.length === 0 ? (
        <div style={{ fontSize: 12.5, color: "var(--muted)" }}>Няма записани отпуски/болнични.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {leaves.map((l) => (
            <div key={l.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, padding: "4px 0", borderBottom: "1px solid rgba(217,215,200,.4)" }}>
              <span><strong>{LEAVE_LABELS[l.type]}</strong> · {new Date(l.startDate).toLocaleDateString("bg-BG")} – {new Date(l.endDate).toLocaleDateString("bg-BG")} ({l.days} дни){l.note ? ` · ${l.note}` : ""}</span>
              <button onClick={() => del(l.id)} style={{ background: "none", border: "none", color: "var(--brick)", cursor: "pointer" }}>×</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
