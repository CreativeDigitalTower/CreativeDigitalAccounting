"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type Company = { id: string; name: string; ownerEmail: string | null; enabled: boolean };

export function AdminEmailBroadcast({ companies }: { companies: Company[] }) {
  const router = useRouter();
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [target, setTarget] = useState<"all" | "selected">("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState("");
  const [filter, setFilter] = useState("");

  function toggleSel(id: string) {
    setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  async function send() {
    if (!subject.trim() || !message.trim()) { setResult("Попълнете тема и съобщение."); return; }
    if (target === "selected" && selected.size === 0) { setResult("Изберете поне една фирма."); return; }
    if (!confirm(`Изпращане до ${target === "all" ? companies.length : selected.size} фирми?`)) return;
    setBusy(true); setResult("");
    const res = await fetch("/api/admin/broadcast", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject, message, target, companyIds: [...selected] }),
    });
    const d = await res.json();
    setBusy(false);
    if (res.ok) { setResult(`Изпратено до ${d.sent}/${d.recipients} фирми.`); setSubject(""); setMessage(""); }
    else setResult(d.error ?? "Грешка");
  }

  async function toggleCompany(id: string, enabled: boolean) {
    await fetch("/api/admin/company-emails", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ companyId: id, enabled }),
    });
    router.refresh();
  }

  const shown = companies.filter((c) => !filter || c.name.toLowerCase().includes(filter.toLowerCase()));

  return (
    <div className="glass panel" style={{ padding: "20px 24px", marginBottom: 18 }}>
      <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 17, fontWeight: 600, margin: "0 0 4px" }}>Съобщение до фирмите</h2>
      <p style={{ fontSize: 12.5, color: "var(--muted)", margin: "0 0 14px" }}>Изпратете важни новини и ъпдейти. Отписаните фирми се прескачат автоматично.</p>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <input placeholder="Тема" value={subject} onChange={(e) => setSubject(e.target.value)} />
        <textarea placeholder="Съобщение… (всеки нов ред е нов абзац)" value={message} onChange={(e) => setMessage(e.target.value)} rows={5} style={{ width: "100%" }} />
        <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
          <label style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 13, margin: 0 }}>
            <input type="radio" checked={target === "all"} onChange={() => setTarget("all")} style={{ width: "auto" }} /> Всички фирми ({companies.length})
          </label>
          <label style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 13, margin: 0 }}>
            <input type="radio" checked={target === "selected"} onChange={() => setTarget("selected")} style={{ width: "auto" }} /> Избрани ({selected.size})
          </label>
          <button onClick={send} disabled={busy} className="btn btn-primary btn-sm" style={{ marginLeft: "auto" }}>{busy ? "Изпращане…" : "Изпрати"}</button>
        </div>
        {result && <div style={{ fontSize: 12.5, color: "var(--emerald-dark)" }}>{result}</div>}
      </div>

      {/* Фирми: избор за broadcast + абониране/отписване */}
      <div style={{ marginTop: 16, borderTop: "1px solid var(--border)", paddingTop: 14 }}>
        <input placeholder="Търси фирма…" value={filter} onChange={(e) => setFilter(e.target.value)} style={{ marginBottom: 10, maxWidth: 280 }} />
        <div style={{ maxHeight: 280, overflowY: "auto", display: "flex", flexDirection: "column", gap: 4 }}>
          {shown.map((c) => (
            <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 8px", borderRadius: 6, background: "rgba(255,255,255,.4)", fontSize: 13 }}>
              {target === "selected" && <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggleSel(c.id)} style={{ width: "auto" }} />}
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600 }}>{c.name}</div>
                <div style={{ fontSize: 11.5, color: "var(--muted)" }}>{c.ownerEmail ?? "няма имейл"}</div>
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, color: c.enabled ? "var(--emerald-dark)" : "var(--muted)" }}>{c.enabled ? "Абонирана" : "Отписана"}</span>
              <button onClick={() => toggleCompany(c.id, !c.enabled)} className="btn btn-ghost btn-sm" style={{ fontSize: 11 }}>
                {c.enabled ? "Отпиши" : "Абонирай"}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
