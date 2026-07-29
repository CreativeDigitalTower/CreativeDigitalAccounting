"use client";

import { useState } from "react";

// Модал за преглед и потвърждение преди изпращане на напомняне за активиране.
// Super-Admin-only вътрешен инструмент (на български, като AdminCompanyRow).
// Не изпраща веднага — админът вижда получатели, тема и текст и потвърждава ръчно.
type Props = {
  companyId: string;
  companyName: string;
  recipients: string[];
  ownerName: string | null;
  createdAt: string;
  lastActivity: string | null;
  invoiceCount: number;
  documentCount: number;
  lastReminderAt: string | null;
  needsOverride: boolean;
  defaultSubject: string;
  defaultParagraphs: string[];
  defaultButtonLabel: string;
  onClose: () => void;
  onSent: () => void;
};

export function ReactivationModal(p: Props) {
  const [selected, setSelected] = useState<string[]>(p.recipients.slice(0, 1));
  const [subject, setSubject] = useState(p.defaultSubject);
  const [body, setBody] = useState(p.defaultParagraphs.join("\n\n"));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [override, setOverride] = useState(false);

  function toggle(email: string) {
    setSelected((s) => (s.includes(email) ? s.filter((e) => e !== email) : [...s, email]));
  }

  async function send() {
    setErr("");
    if (selected.length === 0) { setErr("Изберете поне един получател."); return; }
    setBusy(true);
    const paragraphs = body.split(/\n{2,}/).map((s) => s.trim()).filter(Boolean);
    const res = await fetch("/api/admin/reactivation", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ companyId: p.companyId, recipients: selected, subject, paragraphs, buttonLabel: p.defaultButtonLabel, override: override || undefined }),
    });
    setBusy(false);
    if (res.ok) { p.onSent(); return; }
    const j = await res.json().catch(() => ({}));
    if (j.needsOverride) setOverride(true);
    setErr(j.error ?? "Грешка при изпращане.");
  }

  return (
    <div onClick={p.onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.4)", zIndex: 1000, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "40px 16px", overflowY: "auto" }}>
      <div onClick={(e) => e.stopPropagation()} className="glass panel" style={{ maxWidth: 620, width: "100%", padding: "22px 24px", background: "var(--bg, #fff)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 18, fontWeight: 600, margin: 0 }}>Напомняне за активиране</h3>
          <button onClick={p.onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "var(--muted)" }}>×</button>
        </div>

        <div style={{ fontSize: 12.5, color: "var(--ink-soft)", display: "grid", gridTemplateColumns: "auto 1fr", gap: "3px 12px", marginBottom: 14 }}>
          <span style={{ color: "var(--muted)" }}>Фирма</span><strong>{p.companyName}</strong>
          <span style={{ color: "var(--muted)" }}>Регистрация</span><span>{new Date(p.createdAt).toLocaleDateString("bg-BG")}</span>
          <span style={{ color: "var(--muted)" }}>Последна активност</span><span>{p.lastActivity ? new Date(p.lastActivity).toLocaleDateString("bg-BG") : "няма"}</span>
          <span style={{ color: "var(--muted)" }}>Фактури / документи</span><span>{p.invoiceCount} / {p.documentCount}</span>
          <span style={{ color: "var(--muted)" }}>Последно напомняне</span><span>{p.lastReminderAt ? new Date(p.lastReminderAt).toLocaleDateString("bg-BG") : "няма"}</span>
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: "var(--brass)", letterSpacing: 1 }}>ПОЛУЧАТЕЛИ</label>
          <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 6 }}>
            {p.recipients.map((e) => (
              <label key={e} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
                <input type="checkbox" checked={selected.includes(e)} onChange={() => toggle(e)} /> {e}
              </label>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: "var(--brass)", letterSpacing: 1 }}>ТЕМА</label>
          <input value={subject} onChange={(e) => setSubject(e.target.value)} style={{ width: "100%", padding: "8px 10px", fontSize: 13, marginTop: 6 }} />
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: "var(--brass)", letterSpacing: 1 }}>ТЕКСТ (параграфи, разделени с празен ред)</label>
          <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={12} style={{ width: "100%", padding: "8px 10px", fontSize: 13, marginTop: 6, fontFamily: "inherit", lineHeight: 1.5 }} />
          <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>CTA бутон „{p.defaultButtonLabel}" води към издаване на първа фактура (през login при нужда). Текстът се екранира преди изпращане.</div>
        </div>

        {err && <div style={{ fontSize: 12.5, color: "var(--brick)", marginBottom: 10 }}>{err}</div>}
        {(p.needsOverride || override) && (
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, marginBottom: 10, color: "var(--brick)" }}>
            <input type="checkbox" checked={override} onChange={(e) => setOverride(e.target.checked)} />
            Потвърждавам изпращане въпреки cooldown/лимита
          </label>
        )}

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button onClick={p.onClose} className="btn btn-ghost btn-sm">Откажи</button>
          <button onClick={send} className="btn btn-primary btn-sm" disabled={busy}>{busy ? "Изпращане…" : "Изпрати напомнящ имейл"}</button>
        </div>
      </div>
    </div>
  );
}
