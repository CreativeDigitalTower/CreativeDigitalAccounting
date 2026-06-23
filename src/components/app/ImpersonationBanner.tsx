"use client";

export function ImpersonationBanner({ companyName }: { companyName: string }) {
  async function exit() {
    await fetch("/api/admin/impersonate", { method: "DELETE" });
    window.location.href = "/dashboard/admin";
  }
  return (
    <div
      className="no-print"
      style={{
        background: "var(--brass)", color: "#fff", padding: "8px 18px",
        display: "flex", alignItems: "center", justifyContent: "center", gap: 14,
        fontSize: 13, fontWeight: 600, position: "sticky", top: 0, zIndex: 70,
      }}
    >
      🛡️ Технически достъп до акаунта на <strong>{companyName}</strong> (супер админ режим)
      <button onClick={exit} style={{ background: "rgba(255,255,255,.2)", border: "1px solid rgba(255,255,255,.5)", color: "#fff", borderRadius: 6, padding: "3px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
        Изход от режима
      </button>
    </div>
  );
}
