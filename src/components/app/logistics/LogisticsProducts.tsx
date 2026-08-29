"use client";
import { Fragment, useEffect, useState } from "react";
import { useT } from "@/components/i18n/I18nProvider";

type Alias = { id: string; alias: string };
type Product = {
  id: string; canonicalName: string; materialCode: string | null; unit: string;
  packaging: string | null; category: string | null; isSystemDefault: boolean; active: boolean; notes: string | null; aliases: Alias[];
};

export function LogisticsProducts({ canManage }: { canManage: boolean }) {
  const t = useT();
  const [items, setItems] = useState<Product[]>([]);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ canonicalName: "", materialCode: "", unit: "t", packaging: "", category: "bulk" });
  const [aliasDraft, setAliasDraft] = useState<Record<string, string>>({});
  const [showArchived, setShowArchived] = useState(false);
  const [delTarget, setDelTarget] = useState<Product | null>(null);
  const [delBusy, setDelBusy] = useState(false);

  async function del(id: string) {
    setDelBusy(true);
    const r = await fetch(`/api/logistics/products/${id}`, { method: "DELETE" });
    setDelBusy(false);
    if (r.ok) { setDelTarget(null); load(); }
    else { const j = await r.json().catch(() => ({})); setErr(j.error ?? t("logistics.common.err")); setDelTarget(null); }
  }

  async function load() {
    const r = await fetch("/api/logistics/products");
    if (r.ok) setItems(await r.json());
  }
  useEffect(() => { load(); }, []);

  async function add() {
    setErr(""); setBusy(true);
    const r = await fetch("/api/logistics/products", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ canonicalName: form.canonicalName, materialCode: form.materialCode || null, unit: form.unit, packaging: form.packaging || null, category: form.category || null }),
    });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) { setErr(j.error ?? t("logistics.common.err")); return; }
    setForm({ canonicalName: "", materialCode: "", unit: "t", packaging: "", category: "bulk" });
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
  // Групиране по вид (§6): Насипен → Пакетиран → без категория; вътре по име.
  const order = (c: string | null) => (c === "bulk" ? 0 : c === "packaged" ? 1 : 2);
  const grouped = [...items].filter((p) => showArchived || p.active).sort((a, b) => order(a.category) - order(b.category) || a.canonicalName.localeCompare(b.canonicalName));
  const catLabel = (c: string | null) => c === "bulk" ? t("logistics.products.categoryBulk") : c === "packaged" ? t("logistics.products.categoryPackaged") : t("logistics.products.categoryNone");
  const catCols = canManage ? 8 : 7;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14, flexWrap: "wrap" }}>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 600, margin: 0 }}>{t("logistics.products.title")}</h1>
        <label style={{ marginLeft: "auto", fontSize: 12, color: "var(--muted)", display: "flex", alignItems: "center", gap: 5 }}>
          <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />{t("logistics.products.showArchived")}
        </label>
      </div>
      {err && <div style={{ color: "var(--brick)", fontSize: 12.5, marginBottom: 10 }}>{err}</div>}

      {canManage && (
        <div className="glass panel" style={{ marginBottom: 14, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "end" }}>
          <div><label style={{ fontSize: 11.5, color: "var(--muted)" }}>{t("logistics.products.name")}</label><br />
            <input style={{ ...inp, width: 240 }} value={form.canonicalName} onChange={(e) => setForm({ ...form, canonicalName: e.target.value })} placeholder="CEM II A-LL 52.5 N" /></div>
          <div><label style={{ fontSize: 11.5, color: "var(--muted)" }}>{t("logistics.products.materialCode")}</label><br />
            <input style={{ ...inp, width: 120 }} value={form.materialCode} onChange={(e) => setForm({ ...form, materialCode: e.target.value })} /></div>
          <div><label style={{ fontSize: 11.5, color: "var(--muted)" }}>{t("logistics.products.unit")}</label><br />
            <input style={{ ...inp, width: 60 }} value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} /></div>
          <div><label style={{ fontSize: 11.5, color: "var(--muted)" }}>{t("logistics.products.category")}</label><br />
            <select style={{ ...inp, width: 130 }} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              <option value="bulk">{t("logistics.products.categoryBulk")}</option>
              <option value="packaged">{t("logistics.products.categoryPackaged")}</option>
            </select></div>
          <div><label style={{ fontSize: 11.5, color: "var(--muted)" }}>{t("logistics.products.packaging")}</label><br />
            <input style={{ ...inp, width: 120 }} value={form.packaging} onChange={(e) => setForm({ ...form, packaging: e.target.value })} /></div>
          <button className="btn btn-primary btn-sm" disabled={busy || !form.canonicalName} onClick={add}>{t("logistics.products.add")}</button>
        </div>
      )}

      <div className="glass panel" style={{ overflowX: "auto" }}>
        {items.length === 0 ? <div style={{ fontSize: 13, color: "var(--muted)" }}>{t("logistics.products.empty")}</div> : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr>
              <th style={th}>{t("logistics.products.name")}</th><th style={th}>{t("logistics.products.category")}</th><th style={th}>{t("logistics.products.materialCode")}</th>
              <th style={th}>{t("logistics.products.unit")}</th><th style={th}>{t("logistics.products.packaging")}</th>
              <th style={th}>{t("logistics.products.aliases")}</th><th style={th}>{t("logistics.common.status")}</th>
              {canManage && <th style={th}>{t("logistics.common.actions")}</th>}
            </tr></thead>
            <tbody>
              {grouped.map((p, i) => {
                const prev = grouped[i - 1];
                const header = i === 0 || prev.category !== p.category ? (
                  <tr key={`h-${p.category ?? "none"}`}><td colSpan={catCols} style={{ padding: "10px 8px 4px", fontFamily: "'Fraunces', serif", fontSize: 13, fontWeight: 700, color: "var(--brick)" }}>{catLabel(p.category)}</td></tr>
                ) : null;
                return (
                <Fragment key={p.id}>
                {header}
                <tr key={p.id} style={{ opacity: p.active ? 1 : 0.55 }}>
                  <td style={td}><strong>{p.canonicalName}</strong>{p.isSystemDefault ? <span style={{ marginLeft: 6, fontSize: 10, color: "var(--muted)" }}>●</span> : null}</td>
                  <td style={td}><span style={{ fontSize: 11, background: p.category === "bulk" ? "rgba(15,138,106,.12)" : p.category === "packaged" ? "rgba(178,120,42,.14)" : "rgba(0,0,0,.06)", borderRadius: 8, padding: "1px 7px" }}>{catLabel(p.category)}</span></td>
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
                      <button className="btn btn-ghost btn-sm" onClick={() => patch(p.id, { active: !p.active })}>{p.active ? t("logistics.common.archive") : t("logistics.common.activate")}</button>{" "}
                      <button className="btn btn-ghost btn-sm" style={{ color: "var(--brick)" }} onClick={() => setDelTarget(p)}>{t("logistics.common.delete")}</button>
                    </td>
                  )}
                </tr>
                </Fragment>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {delTarget && (
        <div onClick={() => setDelTarget(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.4)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div className="glass panel" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 420, width: "100%", padding: 20 }}>
            <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 18, margin: "0 0 8px", color: "var(--brick)" }}>{t("logistics.products.deleteTitle")}</h2>
            <p style={{ fontSize: 13, margin: "0 0 12px" }}>{t("logistics.products.deleteConfirm")}</p>
            <div style={{ background: "rgba(0,0,0,.03)", borderRadius: 8, padding: "8px 12px", marginBottom: 14, fontSize: 12.5 }}>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0" }}><span style={{ color: "var(--muted)" }}>{t("logistics.products.name")}</span><strong>{delTarget.canonicalName}</strong></div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0" }}><span style={{ color: "var(--muted)" }}>{t("logistics.products.category")}</span><span>{catLabel(delTarget.category)}</span></div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0" }}><span style={{ color: "var(--muted)" }}>{t("logistics.products.materialCode")}</span><span>{delTarget.materialCode ?? "—"}</span></div>
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button className="btn btn-ghost btn-sm" onClick={() => setDelTarget(null)} disabled={delBusy}>{t("logistics.common.cancel")}</button>
              <button className="btn btn-sm" style={{ background: "var(--brick)", color: "#fff" }} onClick={() => del(delTarget.id)} disabled={delBusy}>{t("logistics.products.deleteConfirmBtn")}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
