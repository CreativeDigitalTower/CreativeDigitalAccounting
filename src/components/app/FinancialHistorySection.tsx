"use client";
import { toNumber, parseLocalizedNumber } from "@/lib/number";
import { NumberField } from "@/components/i18n/NumberField";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { formatCurrency } from "@/lib/constants";
import { useT } from "@/components/i18n/I18nProvider";

type Row = { year: number; revenue: number; expenses: number | null; profit: number | null; employeeCount: number | null };

export function FinancialHistorySection({ initial, goalYear, goalTarget, goalRevenue, currentExpenses, currentProfit }: {
  initial: Row[]; goalYear: number; goalTarget: number | null; goalRevenue: number;
  currentExpenses: number; currentProfit: number;
}) {
  const t = useT();
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
      body: JSON.stringify({ year, revenue: toNumber(revenue), expenses: expenses ? parseLocalizedNumber(expenses) : null, profit: profit ? parseLocalizedNumber(profit) : null, employeeCount: employees ? parseLocalizedNumber(employees) : null }),
    });
    setEditYear(null); setAdding(false); setF({ year: new Date().getFullYear() - 1, revenue: "", expenses: "", profit: "", employees: "" });
    router.refresh();
  }
  async function delRow(year: number) {
    if (!confirm(t("finance.hist.confirmDelete", { year }))) return;
    await fetch(`/api/financial-history?year=${year}`, { method: "DELETE" });
    router.refresh();
  }
  async function saveGoal() {
    const target = parseLocalizedNumber(goal);
    if (target == null || target < 0) return;
    const res = await fetch("/api/financial-goal", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ year: goalYear, targetRevenue: target }) });
    if (res.ok) { setGoalMsg(t("finance.hist.saved")); setTimeout(() => setGoalMsg(""), 1500); router.refresh(); }
  }

  const max = Math.max(1, ...rows.map((r) => Math.max(r.revenue, r.expenses ?? 0, Math.abs(r.profit ?? 0))));
  const chartRows = [...rows].sort((a, b) => a.year - b.year); // хронологично за ръст/спад
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
        <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 15, margin: "0 0 10px" }}>{t("finance.hist.goalTitle", { year: goalYear })}</h3>
        <div style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap" }}>
          <div style={{ flex: "0 1 220px" }}>
            <label style={{ fontSize: 12 }}>{t("finance.hist.goalTarget")}</label>
            <NumberField value={goal} onChange={setGoal} placeholder={t("finance.hist.goalPh")} />
          </div>
          <button className="btn btn-primary btn-sm" onClick={saveGoal}>{t("finance.hist.saveGoal")}</button>
          {goalMsg && <span style={{ fontSize: 12.5, color: "var(--emerald-dark)" }}>{goalMsg}</span>}
        </div>
        {goalPct != null && (
          <div style={{ marginTop: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 4 }}>
              <span>{t("finance.hist.goalProgress", { have: formatCurrency(goalRevenue), target: formatCurrency(goalTarget!) })}</span>
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
          <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 15, margin: 0 }}>{t("finance.hist.histTitle")}</h3>
          {!adding && <button className="btn btn-ghost btn-sm" onClick={() => setAdding(true)}>{t("finance.hist.addBackdated")}</button>}
        </div>

        {adding && (
          <div className="glass" style={{ padding: "14px 16px", borderRadius: 10, marginBottom: 14, border: "1px solid var(--border)", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px,1fr))", gap: 10, alignItems: "flex-end" }}>
            <div><label style={{ fontSize: 12 }}>{t("finance.hist.fYear")}</label><input type="number" value={f.year} onChange={(e) => setF({ ...f, year: Number(e.target.value) })} /></div>
            <div><label style={{ fontSize: 12 }}>{t("finance.hist.fRevenue")}</label><NumberField value={f.revenue} onChange={(v) => setF({ ...f, revenue: v })} /></div>
            <div><label style={{ fontSize: 12 }}>{t("finance.hist.fExpenses")}</label><NumberField value={f.expenses} onChange={(v) => setF({ ...f, expenses: v })} /></div>
            <div><label style={{ fontSize: 12 }}>{t("finance.hist.fProfit")}</label><NumberField value={f.profit} onChange={(v) => setF({ ...f, profit: v })} placeholder={t("finance.hist.auto")} /></div>
            <div><label style={{ fontSize: 12 }}>{t("finance.hist.fEmployees")}</label><input type="number" value={f.employees} onChange={(e) => setF({ ...f, employees: e.target.value })} /></div>
            <div style={{ display: "flex", gap: 6 }}>
              <button className="btn btn-primary btn-sm" disabled={!f.revenue} onClick={() => saveRow(f.year, f.revenue, f.expenses, f.profit, f.employees)}>{t("finance.hist.save")}</button>
              <button className="btn btn-ghost btn-sm" onClick={() => setAdding(false)}>×</button>
            </div>
          </div>
        )}

        {rows.length === 0 ? (
          <div style={{ fontSize: 13, color: "var(--muted)", padding: "12px 0" }}>{t("finance.hist.emptyHist")}</div>
        ) : (
          <>
            {/* Групирана диаграма */}
            <div style={{ display: "flex", gap: 20, alignItems: "flex-end", height: 168, padding: "8px 4px 0", overflowX: "auto", marginBottom: 8 }}>
              {chartRows.map((r, i) => {
                const bars = [
                  { label: t("finance.hist.barRevenue"), v: r.revenue, c: "var(--emerald)" },
                  { label: t("finance.hist.barExpenses"), v: r.expenses ?? 0, c: "var(--brick)" },
                  { label: t("finance.hist.barProfit"), v: r.profit ?? 0, c: "var(--navy)" },
                ];
                // Ръст/спад на приходите спрямо предходната година
                const prev = chartRows[i - 1];
                const yoy = prev && prev.revenue > 0 ? ((r.revenue - prev.revenue) / prev.revenue) * 100 : null;
                const yoyUp = yoy != null && yoy >= 0;
                return (
                  <div key={r.year} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, minWidth: 90 }}>
                    <div style={{ display: "flex", alignItems: "flex-end", gap: 5, height: 118 }}>
                      {bars.map((b, bi) => (
                        <div key={b.label} title={`${b.label}: ${formatCurrency(b.v)}`} style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", height: "100%" }}>
                          <span className="num" style={{ fontSize: 9, fontWeight: 700, color: b.c }}>{b.v >= 1000 ? `${(b.v / 1000).toFixed(0)}k` : Math.round(b.v)}</span>
                          <div className="chart-bar hist-bar" style={{ width: 16, height: `${Math.max(2, (Math.abs(b.v) / max) * 96)}px`, background: b.c, borderRadius: "3px 3px 0 0", animationDelay: `${i * 0.08 + bi * 0.04}s` }} />
                        </div>
                      ))}
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 600 }}>{r.year}</span>
                    {yoy != null && (
                      <span style={{ fontSize: 10.5, fontWeight: 700, color: yoyUp ? "var(--emerald-dark)" : "var(--brick)", background: yoyUp ? "rgba(15,138,106,.12)" : "var(--brick-soft)", borderRadius: 10, padding: "1px 7px" }} title={t("finance.hist.yoyTitle")}>
                        {yoyUp ? "▲ +" : "▼ "}{yoy.toFixed(1)}%
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
            <div style={{ display: "flex", gap: 16, fontSize: 11.5, marginBottom: 12 }}>
              <span><span style={{ display: "inline-block", width: 9, height: 9, background: "var(--emerald)", borderRadius: 2, marginRight: 4 }} />{t("finance.hist.barRevenue")}</span>
              <span><span style={{ display: "inline-block", width: 9, height: 9, background: "var(--brick)", borderRadius: 2, marginRight: 4 }} />{t("finance.hist.barExpenses")}</span>
              <span><span style={{ display: "inline-block", width: 9, height: 9, background: "var(--navy)", borderRadius: 2, marginRight: 4 }} />{t("finance.hist.barProfit")}</span>
            </div>

            {/* Таблица с редакция */}
            <table>
              <thead><tr><th>{t("finance.hist.thYear")}</th><th className="num">{t("finance.hist.thRevenue")}</th><th className="num">{t("finance.hist.thExpenses")}</th><th className="num">{t("finance.hist.thProfit")}</th><th className="num">{t("finance.hist.thEmployees")}</th><th></th></tr></thead>
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
        <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 15, margin: "0 0 4px" }}>{t("finance.hist.allTitle")}</h3>
        <p style={{ fontSize: 12, color: "var(--muted)", margin: "0 0 14px" }}>
          {t("finance.hist.allDesc", { n: yearsCount, yearWord: yearsCount === 1 ? t("finance.hist.yearOne") : t("finance.hist.yearMany"), year: goalYear })}
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px,1fr))", gap: 14 }}>
          {([
            [t("finance.hist.allRevenue"), allTimeRevenue, "var(--emerald-dark)"],
            [t("finance.hist.allExpenses"), allTimeExpenses, "var(--brick)"],
            [t("finance.hist.allProfit"), allTimeProfit, allTimeProfit >= 0 ? "var(--navy)" : "var(--brick)"],
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
  const t = useT();
  const [revenue, setRevenue] = useState(String(row.revenue));
  const [expenses, setExpenses] = useState(row.expenses != null ? String(row.expenses) : "");
  const [profit, setProfit] = useState(row.profit != null ? String(row.profit) : "");
  const [employees, setEmployees] = useState(row.employeeCount != null ? String(row.employeeCount) : "");
  return (
    <tr>
      <td style={{ fontWeight: 600 }}>{row.year}</td>
      <td><NumberField value={revenue} onChange={setRevenue} style={{ padding: "5px 7px", fontSize: 12.5, textAlign: "right" }} /></td>
      <td><NumberField value={expenses} onChange={setExpenses} style={{ padding: "5px 7px", fontSize: 12.5, textAlign: "right" }} /></td>
      <td><NumberField value={profit} onChange={setProfit} placeholder={t("finance.hist.auto")} style={{ padding: "5px 7px", fontSize: 12.5, textAlign: "right" }} /></td>
      <td><input type="number" value={employees} onChange={(e) => setEmployees(e.target.value)} style={{ padding: "5px 7px", fontSize: 12.5, textAlign: "right" }} /></td>
      <td style={{ display: "flex", gap: 6 }}>
        <button className="btn btn-primary btn-sm" onClick={() => onSave(row.year, revenue, expenses, profit, employees)}>✓</button>
        <button className="btn btn-ghost btn-sm" onClick={onCancel}>×</button>
      </td>
    </tr>
  );
}
