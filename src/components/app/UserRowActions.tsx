"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const ROLES = [
  { id: "owner", label: "Собственик" },
  { id: "manager", label: "Мениджър" },
  { id: "accountant", label: "Счетоводител" },
  { id: "sales", label: "Продажби" },
  { id: "warehouse", label: "Склад" },
  { id: "viewer", label: "Преглед" },
];

export function UserRowActions({ targetUserId, role, canManageOwner }: { targetUserId: string; role: string; canManageOwner: boolean }) {
  const router = useRouter();
  const [current, setCurrent] = useState(role);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function changeRole(next: string) {
    setBusy(true); setMsg(""); setCurrent(next);
    const res = await fetch("/api/users", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ targetUserId, role: next }) });
    setBusy(false);
    if (res.ok) { setMsg("✓"); router.refresh(); setTimeout(() => setMsg(""), 1500); }
    else { setCurrent(role); setMsg((await res.json()).error ?? "Грешка"); }
  }

  async function revoke() {
    if (!confirm("Премахване на достъпа на този потребител до фирмата?")) return;
    setBusy(true); setMsg("");
    const res = await fetch(`/api/users?userId=${targetUserId}`, { method: "DELETE" });
    setBusy(false);
    if (res.ok) router.refresh();
    else setMsg((await res.json()).error ?? "Грешка");
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <select value={current} onChange={(e) => changeRole(e.target.value)} disabled={busy} style={{ width: "auto", padding: "4px 8px", fontSize: 12 }}>
        {ROLES.map((r) => (
          <option key={r.id} value={r.id} disabled={r.id === "owner" && !canManageOwner}>{r.label}</option>
        ))}
      </select>
      <button onClick={revoke} disabled={busy} className="btn btn-ghost btn-sm" style={{ color: "var(--brick)" }}>Премахни достъп</button>
      {msg && <span style={{ fontSize: 11.5, color: msg === "✓" ? "var(--emerald)" : "var(--brick)" }}>{msg}</span>}
    </div>
  );
}
