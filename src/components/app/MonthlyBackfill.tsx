"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatCurrency } from "@/lib/constants";

const MONTHS = ["Януари", "Февруари", "Март", "Април", "Май", "Юни", "Юли", "Август", "Септември", "Октомври", "Ноември", "Декември"];

type Row = { month: number; payroll: number | null; revenue: number; expenses: number };

export function MonthlyBackfill({ year, currentMonth, defaultPayroll, months }: {
  year: number; currentMonth: number; defaultPayroll: number; months: Row[];
}) {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>(months);
  const [savingM, setSavingM] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const hasData = months.some((m) => m.revenue > 0 || m.expenses > 0 || m.payroll != null);

  function setCell(m: number, key: keyof Row, val: number | null) {
    setRows((p) => p.map((r) => (r.month === m ? { ...r, [key]: val } : r)));
  }

  async function saveMonth(m: number) {
    const r = rows.find((x) => x.month === m)!;
    setSavingM(m);
    try {
      await Promise.all([
        // ръчни приходи/разходи
        fetch("/api/analytics/monthly", {
          method: "PUT", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ year, month: m, revenue: r.revenue || 0, expenses: r.expenses || 0 }),
        }),
        // корекция на заплати (или изчистване към авто-стойността)
        r.payroll == null
          ? fetch(`/api/analytics/payroll?year=${year}&month=${m}`, { method: "DELETE" })
          : fetch("/api/analytics/payroll", {
              method: "PUT", headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ year, month: m, amount: r.payroll }),
            }),
      ]);
      router.refresh();
    } finally { setSavingM(null); }
  }

  return (
    <div className="glass panel">
      <button onClick={() => setOpen((v) => !v)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, width: "100%", textAlign: "left", display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ color: "var(--muted)" }}>{open ? "▼" : "▶"}</span>
        <span style={{ fontFamily: "'Fraunces', serif", fontSize: 15, fontWeight: 700 }}>Месечни данни за {year} г.</span>
        <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--muted)" }}>{hasData ? "въведени данни" : "празно"} · {open ? "скрий" : "покажи"}</span>
      </button>
      {!open ? null : (<>
      <p style={{ fontSize: 12, color: "var(--muted)", margin: "12px 0 14px" }}>
        Въведете приходи и разходи по месеци назад (за прехвърляне от предишна система). Разходът за заплати се изчислява автоматично от заплатите на служителите, но може да се коригира за всеки месец (отпуски, болнични, бонуси, промяна на заплата). Тези стойности се включват в годишните приходи, разходи и печалба.
      </p>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", fontSize: 13 }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left" }}>Месец</th>
              <th className="num">Ръчни приходи (€)</th>
              <th className="num">Ръчни разходи (€)</th>
              <th className="num">Заплати – разход (€)</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const isFuture = r.month > currentMonth;
              return (
                <tr key={r.month} style={{ opacity: isFuture ? 0.55 : 1 }}>
                  <td style={{ fontWeight: 600 }}>{MONTHS[r.month]}</td>
                  <td className="num">
                    <input type="number" value={r.revenue || ""} placeholder="0"
                      onChange={(e) => setCell(r.month, "revenue", e.target.value ? Number(e.target.value) : 0)}
                      style={{ width: 110, padding: "5px 8px", fontSize: 12.5, textAlign: "right" }} />
                  </td>
                  <td className="num">
                    <input type="number" value={r.expenses || ""} placeholder="0"
                      onChange={(e) => setCell(r.month, "expenses", e.target.value ? Number(e.target.value) : 0)}
                      style={{ width: 110, padding: "5px 8px", fontSize: 12.5, textAlign: "right" }} />
                  </td>
                  <td className="num">
                    <input type="number" value={r.payroll ?? ""} placeholder={`авто ${defaultPayroll.toFixed(0)}`}
                      onChange={(e) => setCell(r.month, "payroll", e.target.value ? Number(e.target.value) : null)}
                      title={r.payroll == null ? `Автоматично: ${formatCurrency(defaultPayroll)}` : "Ръчна корекция"}
                      style={{ width: 130, padding: "5px 8px", fontSize: 12.5, textAlign: "right", background: r.payroll != null ? "var(--brass-soft)" : undefined }} />
                  </td>
                  <td>
                    <button className="btn btn-ghost btn-sm" disabled={savingM === r.month} onClick={() => saveMonth(r.month)}>
                      {savingM === r.month ? "…" : "Запази"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p style={{ fontSize: 11, color: "var(--muted)", marginTop: 10 }}>
        Празно поле „Заплати" = автоматично изчисление ({formatCurrency(defaultPayroll)}/месец). Оцветеното поле означава ръчна корекция за месеца.
      </p>
      </>)}
    </div>
  );
}
