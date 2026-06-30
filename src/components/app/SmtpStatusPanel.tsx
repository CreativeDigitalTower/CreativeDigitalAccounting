"use client";
import { useEffect, useState } from "react";

type Config = { configured: boolean; host: string | null; port: number; secure: boolean; user: string | null; from: string; replyTo: string; hasPassword: boolean };
type Status = { config: Config; verify: { ok: boolean; error?: string } } | null;

export function SmtpStatusPanel() {
  const [status, setStatus] = useState<Status>(null);
  const [loading, setLoading] = useState(true);
  const [testTo, setTestTo] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);

  async function load() {
    setLoading(true);
    try {
      const r = await fetch("/api/admin/email-test");
      setStatus(await r.json());
    } catch { setStatus(null); }
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function sendTest() {
    setSending(true); setResult(null);
    try {
      const r = await fetch("/api/admin/email-test", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(testTo ? { to: testTo } : {}),
      });
      const d = await r.json();
      if (d.ok) setResult({ ok: true, msg: `Тестовият имейл е изпратен успешно до ${d.to}.` });
      else setResult({ ok: false, msg: `Неуспешно (${d.status}): ${d.error || "няма детайли"}` });
    } catch (e) {
      setResult({ ok: false, msg: "Грешка при заявката: " + String(e) });
    }
    setSending(false);
  }

  const c = status?.config;
  const v = status?.verify;
  const online = !!v?.ok;

  return (
    <div className="glass panel" style={{ padding: "20px 24px", marginBottom: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
        <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 17, fontWeight: 600, margin: 0 }}>SMTP връзка</h2>
        {loading ? (
          <span style={{ fontSize: 12.5, color: "var(--muted)" }}>Проверка…</span>
        ) : (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 12.5, fontWeight: 700, color: online ? "var(--emerald-dark)" : "var(--brick)" }}>
            <span style={{ width: 9, height: 9, borderRadius: "50%", background: online ? "var(--emerald)" : "var(--brick)", display: "inline-block" }} />
            {online ? "Връзката е успешна" : c?.configured ? "Грешка във връзката" : "Не е конфигуриран"}
          </span>
        )}
      </div>

      {!loading && c && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: "8px 18px", fontSize: 12.5, marginBottom: 14 }}>
          <div><span style={{ color: "var(--muted)" }}>Host:</span> {c.host ?? "—"}</div>
          <div><span style={{ color: "var(--muted)" }}>Port:</span> {c.port} {c.secure ? "(SSL/TLS)" : "(STARTTLS)"}</div>
          <div><span style={{ color: "var(--muted)" }}>Потребител:</span> {c.user ?? "—"}</div>
          <div><span style={{ color: "var(--muted)" }}>Парола:</span> {c.hasPassword ? "✓ зададена" : "✕ липсва"}</div>
          <div style={{ gridColumn: "1 / -1" }}><span style={{ color: "var(--muted)" }}>From:</span> {c.from}</div>
          <div style={{ gridColumn: "1 / -1" }}><span style={{ color: "var(--muted)" }}>Reply-To:</span> {c.replyTo}</div>
        </div>
      )}

      {!loading && v && !v.ok && v.error && (
        <div style={{ background: "var(--brick-soft)", border: "1px solid var(--brick)", color: "var(--brick)", borderRadius: 8, padding: "9px 13px", fontSize: 12.5, marginBottom: 14 }}>
          ⚠ {v.error}
        </div>
      )}

      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <input type="email" value={testTo} onChange={(e) => setTestTo(e.target.value)} placeholder={c?.user ?? "адрес за тест (по подразбиране office@)"} style={{ flex: "1 1 220px", minWidth: 200 }} />
        <button onClick={sendTest} disabled={sending} className="btn btn-primary btn-sm">{sending ? "Изпращане…" : "Изпрати тестов имейл"}</button>
        <button onClick={load} disabled={loading} className="btn btn-ghost btn-sm">↻ Провери връзката</button>
      </div>

      {result && (
        <div style={{ marginTop: 12, fontSize: 12.5, fontWeight: 600, color: result.ok ? "var(--emerald-dark)" : "var(--brick)" }}>
          {result.ok ? "✓ " : "✕ "}{result.msg}
        </div>
      )}
    </div>
  );
}
