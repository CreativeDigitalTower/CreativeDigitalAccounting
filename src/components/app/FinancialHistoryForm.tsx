"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function FinancialHistoryForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [year, setYear] = useState(new Date().getFullYear() - 1);
  const [revenue, setRevenue] = useState("");
  const [profit, setProfit] = useState("");
  const [employees, setEmployees] = useState("");

  async function save() {
    setSaving(true);
    const res = await fetch("/api/financial-history", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        year: Number(year),
        revenue: parseFloat(revenue) || 0,
        profit: profit ? parseFloat(profit) : null,
        employeeCount: employees ? parseInt(employees) : null,
      }),
    });
    setSaving(false);
    if (res.ok) {
      setRevenue(""); setProfit(""); setEmployees("");
      setOpen(false);
      router.refresh();
    }
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn btn-ghost btn-sm">
        + Въведи данни със задна дата
      </button>
    );
  }

  return (
    <div className="glass" style={{ padding: "16px 18px", borderRadius: 10, marginTop: 12, border: "1px solid var(--border)" }}>
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>Историческа година (оборот / печалба назад във времето)</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 10, alignItems: "flex-end" }}>
        <div>
          <label>Година</label>
          <input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} min={1990} max={2100} />
        </div>
        <div>
          <label>Оборот (EUR)</label>
          <input type="number" value={revenue} onChange={(e) => setRevenue(e.target.value)} step="0.01" placeholder="0.00" />
        </div>
        <div>
          <label>Печалба (EUR)</label>
          <input type="number" value={profit} onChange={(e) => setProfit(e.target.value)} step="0.01" placeholder="по избор" />
        </div>
        <div>
          <label>Служители</label>
          <input type="number" value={employees} onChange={(e) => setEmployees(e.target.value)} placeholder="по избор" />
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={save} className="btn btn-primary btn-sm" disabled={saving || !revenue}>Запази</button>
          <button onClick={() => setOpen(false)} className="btn btn-ghost btn-sm">Отказ</button>
        </div>
      </div>
    </div>
  );
}
