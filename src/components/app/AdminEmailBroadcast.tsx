"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/components/i18n/I18nProvider";

type Company = { id: string; name: string; ownerEmail: string | null; enabled: boolean };

export function AdminEmailBroadcast({ companies }: { companies: Company[] }) {
  const t = useT();
  const router = useRouter();
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [target, setTarget] = useState<"all" | "selected">("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState("");
  const [filter, setFilter] = useState("");
  const [files, setFiles] = useState<{ filename: string; dataUrl: string; size: number }[]>([]);

  async function addFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const list = Array.from(e.target.files ?? []);
    e.target.value = "";
    for (const file of list) {
      if (file.size > 8 * 1024 * 1024) { setResult(t("admintools.broadcast.overSize", { name: file.name })); continue; }
      const dataUrl = await new Promise<string>((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result as string); r.onerror = rej; r.readAsDataURL(file); });
      setFiles((prev) => [...prev, { filename: file.name, dataUrl, size: file.size }]);
    }
  }
  const fmtSize = (b: number) => b < 1024 * 1024 ? `${(b / 1024).toFixed(0)} KB` : `${(b / 1024 / 1024).toFixed(1)} MB`;

  function toggleSel(id: string) {
    setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  async function send() {
    if (!subject.trim() || !message.trim()) { setResult(t("admintools.broadcast.errFill")); return; }
    if (target === "selected" && selected.size === 0) { setResult(t("admintools.broadcast.errSelect")); return; }
    if (!confirm(t("admintools.broadcast.confirmSend", { n: target === "all" ? companies.length : selected.size }))) return;
    setBusy(true); setResult("");
    const res = await fetch("/api/admin/broadcast", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject, message, target, companyIds: [...selected], attachments: files.map(({ filename, dataUrl }) => ({ filename, dataUrl })) }),
    });
    const d = await res.json();
    setBusy(false);
    if (res.ok) { setResult(t("admintools.broadcast.sentResult", { sent: d.sent, recipients: d.recipients })); setSubject(""); setMessage(""); setFiles([]); }
    else setResult(d.error ?? t("admintools.broadcast.error"));
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
      <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 17, fontWeight: 600, margin: "0 0 4px" }}>{t("admintools.broadcast.title")}</h2>
      <p style={{ fontSize: 12.5, color: "var(--muted)", margin: "0 0 14px" }}>{t("admintools.broadcast.desc")}</p>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <input placeholder={t("admintools.broadcast.subjectPh")} value={subject} onChange={(e) => setSubject(e.target.value)} />
        <textarea placeholder={t("admintools.broadcast.messagePh")} value={message} onChange={(e) => setMessage(e.target.value)} rows={5} style={{ width: "100%" }} />
        {/* Прикачени файлове (напр. фактури за абонамент) */}
        <div>
          <label style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 12.5, cursor: "pointer", color: "var(--navy)", fontWeight: 600 }}>
            <span style={{display:"inline-flex",alignItems:"center",gap:5}}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" style={{verticalAlign:"-2px"}}><path d="M21 12.5 12.5 21a5 5 0 0 1-7-7l8.5-8.5a3.3 3.3 0 0 1 4.7 4.7L9 18.7a1.7 1.7 0 0 1-2.4-2.4l7.8-7.8"/></svg> {t("admintools.broadcast.attach")}</span>
            <input type="file" multiple onChange={addFiles} style={{ display: "none" }} />
          </label>
          {files.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
              {files.map((f, i) => (
                <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, background: "rgba(255,255,255,.6)", border: "1px solid var(--border)", borderRadius: 16, padding: "3px 10px" }}>
                  {f.filename} <span style={{ color: "var(--muted)" }}>{fmtSize(f.size)}</span>
                  <button type="button" onClick={() => setFiles(files.filter((_, j) => j !== i))} style={{ background: "none", border: "none", color: "var(--brick)", cursor: "pointer" }}>×</button>
                </span>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
          <label style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 13, margin: 0 }}>
            <input type="radio" checked={target === "all"} onChange={() => setTarget("all")} style={{ width: "auto" }} /> {t("admintools.broadcast.allFirms", { n: companies.length })}
          </label>
          <label style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 13, margin: 0 }}>
            <input type="radio" checked={target === "selected"} onChange={() => setTarget("selected")} style={{ width: "auto" }} /> {t("admintools.broadcast.selected", { n: selected.size })}
          </label>
          <button onClick={send} disabled={busy} className="btn btn-primary btn-sm" style={{ marginLeft: "auto" }}>{busy ? t("admintools.broadcast.sending") : t("admintools.broadcast.send")}</button>
        </div>
        {result && <div style={{ fontSize: 12.5, color: "var(--emerald-dark)" }}>{result}</div>}
      </div>

      {/* Фирми: избор за broadcast + абониране/отписване */}
      <div style={{ marginTop: 16, borderTop: "1px solid var(--border)", paddingTop: 14 }}>
        <input placeholder={t("admintools.broadcast.searchPh")} value={filter} onChange={(e) => setFilter(e.target.value)} style={{ marginBottom: 10, maxWidth: 280 }} />
        <div style={{ maxHeight: 280, overflowY: "auto", display: "flex", flexDirection: "column", gap: 4 }}>
          {shown.map((c) => (
            <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 8px", borderRadius: 6, background: "rgba(255,255,255,.4)", fontSize: 13 }}>
              {target === "selected" && <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggleSel(c.id)} style={{ width: "auto" }} />}
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600 }}>{c.name}</div>
                <div style={{ fontSize: 11.5, color: "var(--muted)" }}>{c.ownerEmail ?? t("admintools.broadcast.noEmail")}</div>
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, color: c.enabled ? "var(--emerald-dark)" : "var(--muted)" }}>{c.enabled ? t("admintools.broadcast.subscribed") : t("admintools.broadcast.unsubscribed")}</span>
              <button onClick={() => toggleCompany(c.id, !c.enabled)} className="btn btn-ghost btn-sm" style={{ fontSize: 11 }}>
                {c.enabled ? t("admintools.broadcast.unsub") : t("admintools.broadcast.sub")}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
