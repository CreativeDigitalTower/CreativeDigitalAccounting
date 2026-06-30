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
      <button onClick={() => setOpen((v) => !v)} className="btn btn-ghost btn-sm">✉ Изпрати на клиент</button>
      {decisionBadge}
      {open && (
        <div className="glass" style={{ position: "absolute", marginTop: 40, right: 24, zIndex: 30, padding: 16, borderRadius: 12, width: 320, boxShadow: "0 8px 30px rgba(0,0,0,.12)" }}>
          <div style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 8 }}>Имейл на клиента</div>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="client@firma.bg" style={{ width: "100%", marginBottom: 10 }} />
          <p style={{ fontSize: 11.5, color: "var(--muted)", margin: "0 0 10px" }}>Клиентът ще получи линк за преглед, изтегляне и приемане/отхвърляне.</p>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button onClick={send} disabled={busy} className="btn btn-primary btn-sm">{busy ? "Изпращане…" : "Изпрати"}</button>
            {done && <span style={{ fontSize: 12, color: "var(--emerald-dark)" }}>{done}</span>}
          </div>
          {sentAt && <p style={{ fontSize: 11, color: "var(--muted)", marginTop: 8 }}>Последно изпратено: {new Date(sentAt).toLocaleString("bg-BG")}</p>}
        </div>
      )}
    </>
  );
}
