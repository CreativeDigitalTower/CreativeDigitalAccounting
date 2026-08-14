"use client";
import { useEffect, useState } from "react";
import { useT } from "@/components/i18n/I18nProvider";

type Carrier = { id: string; name: string; eik: string | null; contact: string | null; phone: string | null; email: string | null; active: boolean };

export function LogisticsCarriers({ canManage }: { canManage: boolean }) {
  const t = useT();
  const [items, setItems] = useState<Carrier[]>([]);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ name: "", eik: "", contact: "", phone: "", email: "" });

  async function load() { const r = await fetch("/api/logistics/carriers"); if (r.ok) setItems(await r.json()); }
  useEffect(() => { load(); }, []);

  async function add() {
    setErr(""); setBusy(true);
    const r = await fetch("/api/logistics/carriers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: form.name, eik: form.eik || null, contact: form.contact || null, phone: form.phone || null, email: form.email || null }) });
    const j = await r.json().catch(() => ({})); setBusy(false);
    if (!r.ok) { setErr(j.error ?? t("logistics.common.err")); return; }
    setForm({ name: "", eik: "", contact: "", phone: "", email: "" }); load();
  }
  async function patch(id: string, body: unknown) { const r = await fetch(`/api/logistics/carriers/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }); if (r.ok) load(); }

  const inp = { padding: "6px 9px", fontSize: 13 } as const;
  const th = { textAlign: "left" as const, padding: "7px 8px", color: "var(--muted)", fontSize: 12 };
  const td = { padding: "7px 8px", fontSize: 12.5, borderTop: "1px solid rgba(217,215,200,.5)" };

  return (
    <div>
      <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 600, marginBottom: 14 }}>{t("logistics.carriers.title")}</h1>
      {err && <div style={{ color: "var(--brick)", fontSize: 12.5, marginBottom: 10 }}>{err}</div>}
      {canManage && (
        <div className="glass panel" style={{ marginBottom: 14, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "end" }}>
          <div><label style={{ fontSize: 11.5, color: "var(--muted)" }}>{t("logistics.carriers.name")}</label><br /><input style={{ ...inp, width: 180 }} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div><label style={{ fontSize: 11.5, color: "var(--muted)" }}>{t("logistics.carriers.eik")}</label><br /><input style={{ ...inp, width: 110 }} value={form.eik} onChange={(e) => setForm({ ...form, eik: e.target.value })} /></div>
          <div><label style={{ fontSize: 11.5, color: "var(--muted)" }}>{t("logistics.carriers.contact")}</label><br /><input style={{ ...inp, width: 140 }} value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} /></div>
          <div><label style={{ fontSize: 11.5, color: "var(--muted)" }}>{t("logistics.carriers.phone")}</label><br /><input style={{ ...inp, width: 120 }} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
          <button className="btn btn-primary btn-sm" disabled={busy || !form.name} onClick={add}>{t("logistics.carriers.add")}</button>
        </div>
      )}
      <div className="glass panel" style={{ overflowX: "auto" }}>
        {items.length === 0 ? <div style={{ fontSize: 13, color: "var(--muted)" }}>{t("logistics.carriers.empty")}</div> : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr>
              <th style={th}>{t("logistics.carriers.name")}</th><th style={th}>{t("logistics.carriers.eik")}</th><th style={th}>{t("logistics.carriers.contact")}</th>
              <th style={th}>{t("logistics.carriers.phone")}</th><th style={th}>{t("logistics.common.status")}</th>{canManage && <th style={th}>{t("logistics.common.actions")}</th>}
            </tr></thead>
            <tbody>
              {items.map((c) => (
                <tr key={c.id} style={{ opacity: c.active ? 1 : 0.55 }}>
                  <td style={td}><strong>{c.name}</strong></td><td style={td}>{c.eik ?? "—"}</td><td style={td}>{c.contact ?? "—"}</td>
                  <td style={td}>{c.phone ?? "—"}</td><td style={td}>{c.active ? t("logistics.common.active") : t("logistics.common.inactive")}</td>
                  {canManage && <td style={td}><button className="btn btn-ghost btn-sm" onClick={() => patch(c.id, { active: !c.active })}>{c.active ? t("logistics.common.archive") : t("logistics.common.activate")}</button></td>}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
