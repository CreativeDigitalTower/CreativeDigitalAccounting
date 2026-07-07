"use client";

import { useRouter } from "next/navigation";

export function FirmClientBanner({ companyName, own = false }: { companyName: string; own?: boolean }) {
  const router = useRouter();
  async function exit() {
    const res = await fetch("/api/firm/switch", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ companyId: null }) });
    const data = await res.json().catch(() => ({}));
    router.push(data.redirect ?? "/firm");
    router.refresh();
  }
  return (
    <div className="no-print" style={{ background: "var(--navy)", color: "#fff", padding: "8px 20px", display: "flex", alignItems: "center", gap: 12, fontSize: 13, flexWrap: "wrap" }}>
      <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: .8, background: "rgba(255,255,255,.18)", borderRadius: 10, padding: "2px 9px" }}>СЧЕТОВОДНА КЪЩА</span>
      <span>{own ? <>Собствена счетоводна фирма — <strong>{companyName}</strong></> : <>Работите по фирма <strong>{companyName}</strong></>}</span>
      <button onClick={exit} className="btn btn-sm" style={{ marginLeft: "auto", background: "rgba(255,255,255,.16)", color: "#fff", border: "1px solid rgba(255,255,255,.3)" }}>← Към клиентите</button>
    </div>
  );
}
