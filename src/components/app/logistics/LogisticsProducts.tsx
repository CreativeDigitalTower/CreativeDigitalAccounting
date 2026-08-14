"use client";
import { useEffect, useState } from "react";
import { useT } from "@/components/i18n/I18nProvider";

type Alias = { id: string; alias: string };
type Product = {
  id: string; canonicalName: string; materialCode: string | null; unit: string;
  packaging: string | null; active: boolean; notes: string | null; aliases: Alias[];
};

export function LogisticsProducts({ canManage }: { canManage: boolean }) {
  const t = useT();
  const [items, setItems] = useState<Product[]>([]);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ canonicalName: "", materialCode: "", unit: "t", packaging: "" });
  const [aliasDraft, setAliasDraft] = useState<Record<string, string>>({});

  async function load() {
    const r = await fetch("/api/logistics/products");
    if (r.ok) setItems(await r.json());
  }
  useEffect(() => { load(); }, []);

  async function add() {
    setErr(""); setBusy(true);
    const r = await fetch("/api/logistics/products", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ canonicalName: form.canonicalName, materialCode: form.materialCode || null, unit: form.unit, packaging: form.packaging || null }),
    });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) { setErr(j.error ?? t("logistics.common.err")); return; }
    setForm({ canonicalName: "", materialCode: "", unit: "t", packaging: "" });
    load();
  }

  async function patch(id: string, body: unknown) {
    setErr(""); setBusy(true);
    const r = await fetch(`/api/logistics/products/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) { setErr(j.error ?? t("logistics.common.err")); return; }
    load();
  }

  const inp = { padding: "6px 9px", fontSize: 13 } as const;
  const th = { textAlign: "left" as const, padding: "7px 8px", color: "var(--muted)", fontSize: 12 };
  const td = { padding: "7px 8px", fontSize: 12.5, borderTop: "1px solid rgba(217,215,200,.5)", verticalAlign: "top" as const };

  return (
    <div>
      <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 600, marginBottom: 14 }}>{t("logistics.products.title")}</h1>
      {err && <div style={{ color: "var(--brick)", fontSize: 12.5, marginBottom: 10 }}>{err}</div>}

      {canManage && (
        <div className="glass panel" style={{ marginBottom: 14, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "end" }}>
          <div><label style={{ fontSize: 11.5, color: "var(--muted)" }}>{t("logistics.products.name")}</label><br />
            <input style={{ ...inp, width: 240 }} value={form.canonicalName} onChange={(e) => setForm({ ...form, canonicalName: e.target.value })} placeholder="CEM II A-LL 52.5 N" /></div>
          <div><label style={{ fontSize: 11.5, color: "var(--muted)" }}>{t("logistics.products.materialCode")}</label><br />
            <input style={{ ...inp, width: 120 }} value={form.materialCode} onChange={(e) => setForm({ ...form, materialCode: e.target.value })} /></div>
          <div><label style={{ fontSize: 11.5, color: "var(--muted)" }}>{t("logistics.products.unit")}</label><br />
            <input style={{ ...inp, width: 60 }} value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} /></div>
          <div><label style={{ fontSize: 11.5, color: "var(--muted)" }}>{t("logistics.products.packaging")}</label><br />
            <input style={{ ...inp, width: 120 }} value={form.packaging} onChange={(e) => setForm({ ...form, packaging: e.target.value })} /></div>
          <button className="btn btn-primary btn-sm" disabled={busy || !form.canonicalName} onClick={add}>{t("logistics.products.add")}</button>
        </div>
      )}

      <div className="glass panel" style={{ overflowX: "auto" }}>
        {items.length === 0 ? <div style={{ fontSize: 13, color: "var(--muted)" }}>{t("logistics.products.empty")}</div> : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr>
              <th style={th}>{t("logistics.products.name")}</th><th style={th}>{t("logistics.products.materialCode")}</th>
              <th style={th}>{t("logistics.products.unit")}</th><th style={th}>{t("logistics.products.packaging")}</th>
              <th style={th}>{t("logistics.products.aliases")}</th><th style={th}>{t("logistics.common.status")}</th>
              {canManage && <th style={th}>{t("logistics.common.actions")}</th>}
            </tr></thead>
            <tbody>
              {items.map((p) => (
                <tr key={p.id} style={{ opacity: p.active ? 1 : 0.55 }}>
                  <td style={td}><strong>{p.canonicalName}</strong></td>
                  <td style={td}>{p.materialCode ?? "—"}</td>
                  <td style={td}>{p.unit}</td>
                  <td style={td}>{p.packaging ?? "—"}</td>
                  <td style={td}>
                    {p.aliases.map((a) => (
                      <span key={a.id} style={{ display: "inline-block", fontSize: 11, background: "rgba(0,0,0,.05)", borderRadius: 8, padding: "1px 6px", margin: "1px 3px 1px 0" }}>
                        {a.alias}{canManage && <button onClick={() => patch(p.id, { removeAliasId: a.id })} style={{ marginLeft: 4, border: "none", background: "none", cursor: "pointer", color: "var(--brick)" }}>×</button>}
                      </span>
                    ))}
                    {canManage && (
                      <span style={{ whiteSpace: "nowrap" }}>
                        <input value={aliasDraft[p.id] ?? ""} onChange={(e) => setAliasDraft({ ...aliasDraft, [p.id]: e.target.value })}
                          placeholder={t("logistics.products.addAlias")} style={{ ...inp, width: 110, fontSize: 11.5, padding: "3px 6px" }} />
                        <button className="btn btn-ghost btn-sm" disabled={!aliasDraft[p.id]} onClick={() => { patch(p.id, { addAlias: aliasDraft[p.id] }); setAliasDraft({ ...aliasDraft, [p.id]: "" }); }}>+</button>
                      </span>
                    )}
                  </td>
                  <td style={td}>{p.active ? t("logistics.common.active") : t("logistics.common.inactive")}</td>
                  {canManage && (
                    <td style={td}>
                      <button className="btn btn-ghost btn-sm" onClick={() => { const mc = prompt(t("logistics.products.materialCode"), p.materialCode ?? ""); if (mc !== null) patch(p.id, { materialCode: mc || null }); }}>{t("logistics.common.edit")}</button>{" "}
                      <button className="btn btn-ghost btn-sm" onClick={() => patch(p.id, { active: !p.active })}>{p.active ? t("logistics.common.archive") : t("logistics.common.activate")}</button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
