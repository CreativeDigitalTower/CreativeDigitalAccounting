"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { formatCurrency } from "@/lib/constants";

type Row = { year: number; revenue: number; expenses: number | null; profit: number | null; employeeCount: number | null };

export function FinancialHistorySection({ initial, goalYear, goalTarget, goalRevenue, currentExpenses, currentProfit }: {
  initial: Row[]; goalYear: number; goalTarget: number | null; goalRevenue: number;
  currentExpenses: number; currentProfit: number;
}) {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>(initial);
  // Синхронизираме с новите данни след router.refresh() (иначе се показват едва след пълен презареждане).
  useEffect(() => { setRows(initial); }, [initial]);
  const [editYear, setEditYear] = useState<number | null>(null);
  const [f, setF] = useState({ year: new Date().getFullYear() - 1, revenue: "", expenses: "", profit: "", employees: "" });
  const [adding, setAdding] = useState(false);
  const [goal, setGoal] = useState(goalTarget != null ? String(goalTarget) : "");
  const [goalMsg, setGoalMsg] = useState("");

  async function saveRow(year: number, revenue: string, expenses: string, profit: string, employees: string) {
    await fetch("/api/financial-history", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ year, revenue: parseFloat(revenue) || 0, expenses: expenses ? parseFloat(expenses) : null, profit: profit ? parseFloat(profit) : null, employeeCount: employees ? parseInt(employees) : null }),
    });
    setEditYear(null); setAdding(false); setF({ year: new Date().getFullYear() - 1, revenue: "", expenses: "", profit: "", employees: "" });
    router.refresh();
  }
  async function delRow(year: number) {
    if (!confirm(`Изтриване на данните за ${year}?`)) return;
    await fetch(`/api/financial-history?year=${year}`, { method: "DELETE" });
    router.refresh();
  }
  async function saveGoal() {
    const t = parseFloat(goal);
    if (!(t >= 0)) return;
    const res = await fetch("/api/financial-goal", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ year: goalYear, targetRevenue: t }) });
    if (res.ok) { setGoalMsg("Запазено ✓"); setTimeout(() => setGoalMsg(""), 1500); router.refresh(); }
  }

  const max = Math.max(1, ...rows.map((r) => Math.max(r.revenue, r.expenses ?? 0, Math.abs(r.profit ?? 0))));
  const goalPct = goalTarget ? Math.min(100, Math.round((goalRevenue / goalTarget) * 100)) : null;

  // Обобщено за целия период на съществуване: исторически години (без текущата)
  // + данните за текущата година на живо.
  const pastRows = rows.filter((r) => r.year !== goalYear);
  const allTimeRevenue = pastRows.reduce((s, r) => s + r.revenue, 0) + goalRevenue;
  const allTimeExpenses = pastRows.reduce((s, r) => s + (r.expenses ?? 0), 0) + currentExpenses;
  const allTimeProfit = pastRows.reduce((s, r) => s + (r.profit ?? (r.revenue - (r.expenses ?? 0))), 0) + currentProfit;
  const yearsCount = new Set([...pastRows.map((r) => r.year), goalYear]).size;

  return (
    <>
      {/* Финансова цел */}
      <div className="glass panel" style={{ marginBottom: 18 }}>
        <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 15, margin: "0 0 10px" }}>Финансова цел за {goalYear}</h3>
        <div style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap" }}>
          <div style={{ flex: "0 1 220px" }}>
            <label style={{ fontSize: 12 }}>Целеви оборот (EUR)</label>
            <input type="number" value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="напр. 100000" />
          </div>
          <button className="btn btn-primary btn-sm" onClick={saveGoal}>Запази цел</button>
          {goalMsg && <span style={{ fontSize: 12.5, color: "var(--emerald-dark)" }}>{goalMsg}</span>}
        </div>
        {goalPct != null && (
          <div style={{ marginTop: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 4 }}>
              <span>Изпълнение: {formatCurrency(goalRevenue)} / {formatCurrency(goalTarget!)}</span>
              <strong style={{ color: goalPct >= 70 ? "var(--emerald-dark)" : "var(--brass)" }}>{goalPct}%</strong>
            </div>
            <div style={{ height: 8, background: "rgba(217,215,200,.5)", borderRadius: 4, overflow: "hidden" }}>
              <div style={{ width: `${goalPct}%`, height: "100%", background: "var(--emerald)", borderRadius: 4, transition: "width .5s" }} />
            </div>
          </div>
        )}
      </div>

      {/* Историческа справка + графика */}
      <div className="glass panel">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, gap: 12, flexWrap: "wrap" }}>
          <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 15, margin: 0 }}>Историческа справка (приходи · разходи · печалба)</h3>
          {!adding && <button className="btn btn-ghost btn-sm" onClick={() => setAdding(true)}>+ Въведи данни със задна дата</button>}
        </div>

        {adding && (
          <div className="glass" style={{ padding: "14px 16px", borderRadius: 10, marginBottom: 14, border: "1px solid var(--border)", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px,1fr))", gap: 10, alignItems: "flex-end" }}>
            <div><label style={{ fontSize: 12 }}>Година</label><input type="number" value={f.year} onChange={(e) => setF({ ...f, year: Number(e.target.value) })} /></div>
            <div><label style={{ fontSize: 12 }}>Оборот</label><input type="number" value={f.revenue} onChange={(e) => setF({ ...f, revenue: e.target.value })} /></div>
            <div><label style={{ fontSize: 12 }}>Разходи</label><input type="number" value={f.expenses} onChange={(e) => setF({ ...f, expenses: e.target.value })} /></div>
            <div><label style={{ fontSize: 12 }}>Печалба</label><input type="number" value={f.profit} onChange={(e) => setF({ ...f, profit: e.target.value })} placeholder="авто" /></div>
            <div><label style={{ fontSize: 12 }}>Служители</label><input type="number" value={f.employees} onChange={(e) => setF({ ...f, employees: e.target.value })} /></div>
            <div style={{ display: "flex", gap: 6 }}>
              <button className="btn btn-primary btn-sm" disabled={!f.revenue} onClick={() => saveRow(f.year, f.revenue, f.expenses, f.profit, f.employees)}>Запази</button>
              <button className="btn btn-ghost btn-sm" onClick={() => setAdding(false)}>×</button>
            </div>
          </div>
        )}

        {rows.length === 0 ? (
          <div style={{ fontSize: 13, color: "var(--muted)", padding: "12px 0" }}>Въведете оборотите, разходите и печалбата от предходни години, за да следите растежа.</div>
        ) : (
          <>
            {/* Групирана диаграма */}
            <div style={{ display: "flex", gap: 20, alignItems: "flex-end", height: 150, padding: "8px 4px 0", overflowX: "auto", marginBottom: 8 }}>
              {rows.map((r) => {
                const bars = [
                  { label: "Приходи", v: r.revenue, c: "var(--emerald)" },
                  { label: "Разходи", v: r.expenses ?? 0, c: "var(--brick)" },
                  { label: "Печалба", v: r.profit ?? 0, c: "var(--navy)" },
                ];
                return (
                  <div key={r.year} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, minWidth: 90 }}>
                    <div style={{ display: "flex", alignItems: "flex-end", gap: 5, height: 118 }}>
                      {bars.map((b) => (
                        <div key={b.label} title={`${b.label}: ${formatCurrency(b.v)}`} style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", height: "100%" }}>
                          <span className="num" style={{ fontSize: 9, fontWeight: 700, color: b.c }}>{b.v >= 1000 ? `${(b.v / 1000).toFixed(0)}k` : Math.round(b.v)}</span>
                          <div className="chart-bar" style={{ width: 16, height: `${Math.max(2, (Math.abs(b.v) / max) * 96)}px`, background: b.c, borderRadius: "3px 3px 0 0" }} />
                        </div>
                      ))}
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 600 }}>{r.year}</span>
                  </div>
                );
              })}
            </div>
            <div style={{ display: "flex", gap: 16, fontSize: 11.5, marginBottom: 12 }}>
              <span><span style={{ display: "inline-block", width: 9, height: 9, background: "var(--emerald)", borderRadius: 2, marginRight: 4 }} />Приходи</span>
              <span><span style={{ display: "inline-block", width: 9, height: 9, background: "var(--brick)", borderRadius: 2, marginRight: 4 }} />Разходи</span>
              <span><span style={{ display: "inline-block", width: 9, height: 9, background: "var(--navy)", borderRadius: 2, marginRight: 4 }} />Печалба</span>
            </div>

            {/* Таблица с редакция */}
            <table>
              <thead><tr><th>Година</th><th className="num">Приходи</th><th className="num">Разходи</th><th className="num">Печалба</th><th className="num">Служители</th><th></th></tr></thead>
              <tbody>
                {rows.map((r) => editYear === r.year ? (
                  <EditRow key={r.year} row={r} onSave={saveRow} onCancel={() => setEditYear(null)} />
                ) : (
                  <tr key={r.year}>
                    <td style={{ fontWeight: 600 }}>{r.year}</td>
                    <td className="num">{formatCurrency(r.revenue)}</td>
                    <td className="num" style={{ color: "var(--brick)" }}>{r.expenses != null ? formatCurrency(r.expenses) : "—"}</td>
                    <td className="num" style={{ color: "var(--emerald-dark)" }}>{r.profit != null ? formatCurrency(r.profit) : "—"}</td>
                    <td className="num">{r.employeeCount ?? "—"}</td>
                    <td style={{ display: "flex", gap: 6 }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => setEditYear(r.year)}>✎</button>
                      <button className="btn btn-ghost btn-sm" style={{ color: "var(--brick)" }} onClick={() => delRow(r.year)}>×</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>

      {/* Обобщено за целия период на съществуване на фирмата */}
      <div className="glass panel" style={{ marginTop: 18 }}>
        <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 15, margin: "0 0 4px" }}>Обобщено за целия период</h3>
        <p style={{ fontSize: 12, color: "var(--muted)", margin: "0 0 14px" }}>
          Сумарно за всички {yearsCount} {yearsCount === 1 ? "година" : "години"} (историческите данни + текущата {goalYear} г.) — движение и развитие на фирмата.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px,1fr))", gap: 14 }}>
          {([
            ["Общи приходи", allTimeRevenue, "var(--emerald-dark)"],
            ["Общи разходи", allTimeExpenses, "var(--brick)"],
            ["Обща печалба", allTimeProfit, allTimeProfit >= 0 ? "var(--navy)" : "var(--brick)"],
          ] as [string, number, string][]).map(([l, v, c]) => (
            <div key={l}>
              <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 4 }}>{l}</div>
              <div className="num" style={{ fontSize: 22, fontWeight: 700, color: c }}>{formatCurrency(v)}</div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function EditRow({ row, onSave, onCancel }: { row: Row; onSave: (y: number, r: string, e: string, p: string, emp: string) => void; onCancel: () => void }) {
  const [revenue, setRevenue] = useState(String(row.revenue));
  const [expenses, setExpenses] = useState(row.expenses != null ? String(row.expenses) : "");
  const [profit, setProfit] = useState(row.profit != null ? String(row.profit) : "");
  const [employees, setEmployees] = useState(row.employeeCount != null ? String(row.employeeCount) : "");
  return (
    <tr>
      <td style={{ fontWeight: 600 }}>{row.year}</td>
      <td><input type="number" value={revenue} onChange={(e) => setRevenue(e.target.value)} style={{ padding: "5px 7px", fontSize: 12.5, textAlign: "right" }} /></td>
      <td><input type="number" value={expenses} onChange={(e) => setExpenses(e.target.value)} style={{ padding: "5px 7px", fontSize: 12.5, textAlign: "right" }} /></td>
      <td><input type="number" value={profit} onChange={(e) => setProfit(e.target.value)} placeholder="авто" style={{ padding: "5px 7px", fontSize: 12.5, textAlign: "right" }} /></td>
      <td><input type="number" value={employees} onChange={(e) => setEmployees(e.target.value)} style={{ padding: "5px 7px", fontSize: 12.5, textAlign: "right" }} /></td>
      <td style={{ display: "flex", gap: 6 }}>
        <button className="btn btn-primary btn-sm" onClick={() => onSave(row.year, revenue, expenses, profit, employees)}>✓</button>
        <button className="btn btn-ghost btn-sm" onClick={onCancel}>×</button>
      </td>
    </tr>
  );
}
