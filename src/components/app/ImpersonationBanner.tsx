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
      <span style={{display:"inline-flex",alignItems:"center",gap:6,verticalAlign:"-3px"}}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" ><path d="M12 2.5 4.5 5.5V11c0 4.6 3.2 8.4 7.5 9.5 4.3-1.1 7.5-4.9 7.5-9.5V5.5L12 2.5Z"/><path d="m9 12 2 2 4-4"/></svg> Технически достъп</span> до акаунта на <strong>{companyName}</strong> (супер админ режим)
      <button onClick={exit} style={{ background: "rgba(255,255,255,.2)", border: "1px solid rgba(255,255,255,.5)", color: "#fff", borderRadius: 6, padding: "3px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
        Изход от режима
      </button>
    </div>
  );
}
