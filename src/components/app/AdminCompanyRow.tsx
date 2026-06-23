"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const PLANS = [
  { id: "free", label: "Безплатен" },
  { id: "start", label: "Старт" },
  { id: "business", label: "Бизнес" },
  { id: "pro", label: "Про" },
];

type Props = {
  id: string;
  name: string;
  eik: string | null;
  plan: string;
  status: string;
  users: number;
  docs: number;
  createdAt: string;
  owners: string;
};

export function AdminCompanyRow(props: Props) {
  const router = useRouter();
  const [plan, setPlan] = useState(props.plan);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function changePlan(next: string) {
    setSaving(true);
    setSaved(false);
    setPlan(next);
    const res = await fetch("/api/admin/plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ companyId: props.id, plan: next }),
    });
    setSaving(false);
    if (res.ok) {
      setSaved(true);
      router.refresh();
      setTimeout(() => setSaved(false), 2000);
    }
  }

  async function impersonate() {
    const res = await fetch("/api/admin/impersonate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ companyId: props.id }),
    });
    if (res.ok) window.location.href = "/dashboard";
  }

  return (
    <tr>
      <td>
        <div style={{ fontWeight: 600, fontSize: 13.5 }}>{props.name}</div>
        <div style={{ fontSize: 11.5, color: "var(--muted)" }}>{props.owners}</div>
      </td>
      <td className="num" style={{ fontSize: 12.5, color: "var(--muted)" }}>{props.eik ?? "—"}</td>
      <td className="num">{props.users}</td>
      <td className="num">{props.docs}</td>
      <td style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>{props.createdAt}</td>
      <td>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <select value={plan} onChange={(e) => changePlan(e.target.value)} disabled={saving} style={{ width: "auto", padding: "5px 8px", fontSize: 12.5 }}>
            {PLANS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
          {saved && <span style={{ color: "var(--emerald)", fontSize: 12 }}>✓</span>}
        </div>
      </td>
      <td>
        <button onClick={impersonate} className="btn btn-ghost btn-sm">Влез в акаунта →</button>
      </td>
    </tr>
  );
}
