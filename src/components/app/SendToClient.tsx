"use client";
import { useState } from "react";

export function SendToClient({ id, defaultEmail, decision, sentAt }: {
  id: string; defaultEmail?: string | null; decision?: string | null; sentAt?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState(defaultEmail ?? "");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  async function send() {
    if (!/.+@.+\..+/.test(email)) return;
    setBusy(true);
    const res = await fetch(`/api/documents/${id}/send-client`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }),
    });
    setBusy(false);
    if (res.ok) { setDone("Изпратено ✓"); setTimeout(() => setOpen(false), 1500); }
    else setDone("Грешка при изпращане");
  }

  const decisionBadge = decision
    ? <span style={{ fontSize: 12, fontWeight: 700, color: decision === "accepted" ? "var(--emerald-dark)" : "var(--brick)" }}>
        {decision === "accepted" ? "Клиентът прие ✓" : "Клиентът отхвърли ✕"}
      </span>
    : null;

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn btn-ghost btn-sm"style={{display:"inline-flex",alignItems:"center",gap:6}}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" style={{verticalAlign:"-2px"}}><rect x="2.5" y="4.5" width="19" height="15" rx="2.5"/><path d="m3 6 9 6 9-6"/></svg> Изпрати на клиент</button>
      {decisionBadge}
      {open && (
        <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 }}>
          <div onClick={(e) => e.stopPropagation()} className="glass panel" style={{ width: 380, maxWidth: "100%", padding: 22, borderRadius: 14, boxShadow: "0 12px 40px rgba(0,0,0,.18)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 16, margin: 0 }}>Изпрати на клиент</h3>
              <button onClick={() => setOpen(false)} style={{ background: "none", border: "none", fontSize: 20, color: "var(--muted)", cursor: "pointer", lineHeight: 1 }}>×</button>
            </div>
            <label style={{ fontSize: 12.5, fontWeight: 600, display: "block", marginBottom: 6 }}>Имейл на клиента</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="client@firma.bg" style={{ width: "100%", marginBottom: 10 }} autoFocus />
            <p style={{ fontSize: 11.5, color: "var(--muted)", margin: "0 0 14px" }}>Клиентът ще получи линк за преглед, изтегляне и приемане/отхвърляне на документа.</p>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <button onClick={send} disabled={busy} className="btn btn-primary btn-sm">{busy ? "Изпращане…" : "Изпрати"}</button>
              <button onClick={() => setOpen(false)} className="btn btn-ghost btn-sm">Отказ</button>
              {done && <span style={{ fontSize: 12, color: done.includes("✓") ? "var(--emerald-dark)" : "var(--brick)" }}>{done}</span>}
            </div>
            {sentAt && <p style={{ fontSize: 11, color: "var(--muted)", marginTop: 10 }}>Последно изпратено: {new Date(sentAt).toLocaleString("bg-BG")}</p>}
          </div>
        </div>
      )}
    </>
  );
}
