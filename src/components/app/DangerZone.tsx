"use client";
import { useState } from "react";
import { signOut } from "next-auth/react";

export function DangerZone() {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const canDelete = agree && reason.trim().length >= 3 && confirmText.trim().toUpperCase() === "ИЗТРИЙ";

  async function del() {
    setError(""); setBusy(true);
    const res = await fetch("/api/company/delete", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason, confirm: true }),
    });
    if (res.ok) { await signOut({ callbackUrl: "/" }); return; }
    setBusy(false);
    setError((await res.json()).error ?? "Грешка при изтриване.");
  }

  return (
    <div className="glass panel" style={{ padding: "24px 28px", marginBottom: 16, border: "1px solid rgba(178,59,59,.4)" }}>
      <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 17, fontWeight: 600, margin: "0 0 4px", color: "var(--brick)" }}>Опасна зона</h2>
      <p style={{ fontSize: 12.5, color: "var(--muted)", margin: "0 0 14px" }}>
        Изтриването на профила на фирмата е <strong>необратимо</strong>. Всички данни — фактури, клиенти, документи, складове — ще бъдат премахнати завинаги.
      </p>
      {!open ? (
        <button className="btn btn-ghost btn-sm" style={{ color: "var(--brick)", borderColor: "var(--brick)" }} onClick={() => setOpen(true)}>Изтрий профила на фирмата</button>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 460 }}>
          {error && <div style={{ background: "var(--brick-soft)", color: "var(--brick)", borderRadius: 8, padding: "8px 12px", fontSize: 12.5 }}>{error}</div>}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600 }}>Причина за изтриване *</label>
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} placeholder="Защо изтривате профила си?" style={{ width: "100%" }} />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600 }}>Напишете <strong>ИЗТРИЙ</strong> за потвърждение *</label>
            <input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder="ИЗТРИЙ" />
          </div>
          <label style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 12.5, cursor: "pointer" }}>
            <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} style={{ marginTop: 2, width: "auto" }} />
            Разбирам, че това действие е необратимо и потвърждавам изтриването на профила на фирмата.
          </label>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-ghost btn-sm" onClick={() => setOpen(false)} disabled={busy}>Отказ</button>
            <button className="btn btn-sm" style={{ background: canDelete ? "var(--brick)" : "var(--border)", color: "#fff", cursor: canDelete ? "pointer" : "not-allowed" }} disabled={!canDelete || busy} onClick={del}>
              {busy ? "Изтриване…" : "Изтрий завинаги"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
