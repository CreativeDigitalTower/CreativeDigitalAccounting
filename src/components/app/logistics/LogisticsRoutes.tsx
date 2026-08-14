"use client";
import { useEffect, useState } from "react";
import { useT } from "@/components/i18n/I18nProvider";

type Route = { id: string; fromPlace: string; toPlace: string; distanceKm: number | null; estTimeMin: number | null; borderPoint: string | null; active: boolean };

export function LogisticsRoutes({ canManage }: { canManage: boolean }) {
  const t = useT();
  const [items, setItems] = useState<Route[]>([]);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ fromPlace: "", toPlace: "", distanceKm: "", estTimeMin: "", borderPoint: "" });

  async function load() { const r = await fetch("/api/logistics/routes"); if (r.ok) setItems(await r.json()); }
  useEffect(() => { load(); }, []);

  async function add() {
    setErr(""); setBusy(true);
    const r = await fetch("/api/logistics/routes", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fromPlace: form.fromPlace, toPlace: form.toPlace, distanceKm: form.distanceKm ? Number(form.distanceKm) : null, estTimeMin: form.estTimeMin ? Number(form.estTimeMin) : null, borderPoint: form.borderPoint || null }),
    });
    const j = await r.json().catch(() => ({})); setBusy(false);
    if (!r.ok) { setErr(j.error ?? t("logistics.common.err")); return; }
    setForm({ fromPlace: "", toPlace: "", distanceKm: "", estTimeMin: "", borderPoint: "" }); load();
  }
  async function patch(id: string, body: unknown) { const r = await fetch(`/api/logistics/routes/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }); if (r.ok) load(); }

  const inp = { padding: "6px 9px", fontSize: 13 } as const;
  const th = { textAlign: "left" as const, padding: "7px 8px", color: "var(--muted)", fontSize: 12 };
  const td = { padding: "7px 8px", fontSize: 12.5, borderTop: "1px solid rgba(217,215,200,.5)" };

  return (
    <div>
      <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 600, marginBottom: 14 }}>{t("logistics.routes.title")}</h1>
      {err && <div style={{ color: "var(--brick)", fontSize: 12.5, marginBottom: 10 }}>{err}</div>}
      {canManage && (
        <div className="glass panel" style={{ marginBottom: 14, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "end" }}>
          <div><label style={{ fontSize: 11.5, color: "var(--muted)" }}>{t("logistics.routes.from")}</label><br /><input style={{ ...inp, width: 150 }} value={form.fromPlace} onChange={(e) => setForm({ ...form, fromPlace: e.target.value })} placeholder="Бели Извор" /></div>
          <div><label style={{ fontSize: 11.5, color: "var(--muted)" }}>{t("logistics.routes.to")}</label><br /><input style={{ ...inp, width: 150 }} value={form.toPlace} onChange={(e) => setForm({ ...form, toPlace: e.target.value })} placeholder="Скопие" /></div>
          <div><label style={{ fontSize: 11.5, color: "var(--muted)" }}>{t("logistics.routes.distance")}</label><br /><input style={{ ...inp, width: 90 }} value={form.distanceKm} onChange={(e) => setForm({ ...form, distanceKm: e.target.value })} /></div>
          <div><label style={{ fontSize: 11.5, color: "var(--muted)" }}>{t("logistics.routes.border")}</label><br /><input style={{ ...inp, width: 120 }} value={form.borderPoint} onChange={(e) => setForm({ ...form, borderPoint: e.target.value })} /></div>
          <button className="btn btn-primary btn-sm" disabled={busy || !form.fromPlace || !form.toPlace} onClick={add}>{t("logistics.routes.add")}</button>
        </div>
      )}
      <div className="glass panel" style={{ overflowX: "auto" }}>
        {items.length === 0 ? <div style={{ fontSize: 13, color: "var(--muted)" }}>{t("logistics.routes.empty")}</div> : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr>
              <th style={th}>{t("logistics.routes.from")}</th><th style={th}>{t("logistics.routes.to")}</th><th style={th}>{t("logistics.routes.distance")}</th>
              <th style={th}>{t("logistics.routes.border")}</th><th style={th}>{t("logistics.common.status")}</th>{canManage && <th style={th}>{t("logistics.common.actions")}</th>}
            </tr></thead>
            <tbody>
              {items.map((r) => (
                <tr key={r.id} style={{ opacity: r.active ? 1 : 0.55 }}>
                  <td style={td}>{r.fromPlace}</td><td style={td}>{r.toPlace}</td><td style={td}>{r.distanceKm ?? "—"}</td>
                  <td style={td}>{r.borderPoint ?? "—"}</td><td style={td}>{r.active ? t("logistics.common.active") : t("logistics.common.inactive")}</td>
                  {canManage && <td style={td}><button className="btn btn-ghost btn-sm" onClick={() => patch(r.id, { active: !r.active })}>{r.active ? t("logistics.common.archive") : t("logistics.common.activate")}</button></td>}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
