"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/components/i18n/I18nProvider";

export function FinancialHistoryForm() {
  const t = useT();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [year, setYear] = useState(new Date().getFullYear() - 1);
  const [revenue, setRevenue] = useState("");
  const [expenses, setExpenses] = useState("");
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
        expenses: expenses ? parseFloat(expenses) : null,
        profit: profit ? parseFloat(profit) : null,
        employeeCount: employees ? parseInt(employees) : null,
      }),
    });
    setSaving(false);
    if (res.ok) {
      setRevenue(""); setExpenses(""); setProfit(""); setEmployees("");
      setOpen(false);
      router.refresh();
    }
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn btn-ghost btn-sm">
        {t("finance.hist.addBackdated")}
      </button>
    );
  }

  return (
    <div className="glass" style={{ padding: "16px 18px", borderRadius: 10, marginTop: 12, border: "1px solid var(--border)" }}>
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>{t("finance.form.title")}</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 10, alignItems: "flex-end" }}>
        <div>
          <label>{t("finance.form.fYear")}</label>
          <input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} min={1990} max={2100} />
        </div>
        <div>
          <label>{t("finance.form.fRevenue")}</label>
          <input type="number" value={revenue} onChange={(e) => setRevenue(e.target.value)} step="0.01" placeholder={t("finance.form.fRevenuePh")} />
        </div>
        <div>
          <label>{t("finance.form.fExpenses")}</label>
          <input type="number" value={expenses} onChange={(e) => setExpenses(e.target.value)} step="0.01" placeholder={t("finance.form.fExpensesPh")} />
        </div>
        <div>
          <label>{t("finance.form.fProfit")}</label>
          <input type="number" value={profit} onChange={(e) => setProfit(e.target.value)} step="0.01" placeholder={t("finance.form.fProfitPh")} />
        </div>
        <div>
          <label>{t("finance.form.fEmployees")}</label>
          <input type="number" value={employees} onChange={(e) => setEmployees(e.target.value)} placeholder={t("finance.form.fEmployeesPh")} />
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={save} className="btn btn-primary btn-sm" disabled={saving || !revenue}>{t("finance.form.save")}</button>
          <button onClick={() => setOpen(false)} className="btn btn-ghost btn-sm">{t("finance.form.cancel")}</button>
        </div>
      </div>
    </div>
  );
}
