"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/components/i18n/I18nProvider";

const ROLE_IDS = ["owner", "manager", "accountant", "sales", "warehouse", "viewer"] as const;

export function UserRowActions({ targetUserId, role, canManageOwner }: { targetUserId: string; role: string; canManageOwner: boolean }) {
  const t = useT();
  const router = useRouter();
  const [current, setCurrent] = useState(role);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function changeRole(next: string) {
    setBusy(true); setMsg(""); setCurrent(next);
    const res = await fetch("/api/users", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ targetUserId, role: next }) });
    setBusy(false);
    if (res.ok) { setMsg("✓"); router.refresh(); setTimeout(() => setMsg(""), 1500); }
    else { setCurrent(role); setMsg((await res.json()).error ?? t("admintools.roles.error")); }
  }

  async function revoke() {
    if (!confirm(t("admintools.roles.confirmRevoke"))) return;
    setBusy(true); setMsg("");
    const res = await fetch(`/api/users?userId=${targetUserId}`, { method: "DELETE" });
    setBusy(false);
    if (res.ok) router.refresh();
    else setMsg((await res.json()).error ?? t("admintools.roles.error"));
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <select value={current} onChange={(e) => changeRole(e.target.value)} disabled={busy} style={{ width: "auto", padding: "4px 8px", fontSize: 12 }}>
        {ROLE_IDS.map((r) => (
          <option key={r} value={r} disabled={r === "owner" && !canManageOwner}>{t(`admintools.roles.${r}`)}</option>
        ))}
      </select>
      <button onClick={revoke} disabled={busy} className="btn btn-ghost btn-sm" style={{ color: "var(--brick)" }}>{t("admintools.roles.revoke")}</button>
      {msg && <span style={{ fontSize: 11.5, color: msg === "✓" ? "var(--emerald)" : "var(--brick)" }}>{msg}</span>}
    </div>
  );
}
