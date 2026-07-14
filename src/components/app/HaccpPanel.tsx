"use client";

import { useState } from "react";
import Link from "next/link";
import { useT } from "@/components/i18n/I18nProvider";

export type TD = Record<string, string | null> & { id: string; productName: string };

const FIELDS: { key: string; area?: boolean; rows?: number; hasPh?: boolean }[] = [
  { key: "docNumber", hasPh: true },
  { key: "productName", hasPh: true },
  { key: "purpose", area: true, rows: 2, hasPh: true },
  { key: "classification", area: true, rows: 2, hasPh: true },
  { key: "ingredients", area: true, rows: 3 },
  { key: "rawMaterials", area: true, rows: 3 },
  { key: "packaging", area: true, rows: 2 },
  { key: "preparation", area: true, rows: 3 },
  { key: "process", area: true, rows: 5 },
  { key: "bakingTime", hasPh: true },
  { key: "bakingTemp", hasPh: true },
  { key: "cooling", hasPh: true },
  { key: "organoleptic", area: true, rows: 3 },
  { key: "physicochemical", area: true, rows: 2 },
  { key: "microbiological", area: true, rows: 3 },
  { key: "samplingMethods", area: true, rows: 3 },
  { key: "labeling", area: true, rows: 3 },
  { key: "storage", hasPh: true },
  { key: "shelfLife", hasPh: true },
  { key: "storageConditions", hasPh: true },
  { key: "transport", hasPh: true },
  { key: "productionControl", area: true, rows: 3 },
  { key: "notes", area: true, rows: 2 },
];

const empty: Record<string, string> = Object.fromEntries(FIELDS.map((f) => [f.key, ""]));

export function HaccpPanel({ initial }: { initial: TD[] }) {
  const t = useT();
  const [docs, setDocs] = useState<TD[]>(initial);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, string>>(empty);
  const [error, setError] = useState("");

  function startAdd() { setForm(empty); setEditing(null); setShowForm(true); setError(""); window.scrollTo({ top: 0 }); }
  function startEdit(d: TD) {
    const f: Record<string, string> = { ...empty };
    for (const k of Object.keys(empty)) f[k] = (d[k] as string) ?? "";
    setForm(f); setEditing(d.id); setShowForm(true); setError(""); window.scrollTo({ top: 0 });
  }
  async function reload() { const r = await fetch("/api/technological-docs"); if (r.ok) setDocs(await r.json()); }
  async function save() {
    setError("");
    if (!form.productName.trim()) { setError(t("haccp.errName")); return; }
    const res = await fetch(editing ? `/api/technological-docs/${editing}` : "/api/technological-docs", {
      method: editing ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
    });
    if (res.ok) { setShowForm(false); reload(); } else setError((await res.json()).error ?? t("haccp.errGeneric"));
  }
  async function remove(id: string) {
    if (!confirm(t("haccp.confirmDelete"))) return;
    const res = await fetch(`/api/technological-docs/${id}`, { method: "DELETE" });
    if (res.ok) setDocs((d) => d.filter((x) => x.id !== id));
  }

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
        <div>
          <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 25, fontWeight: 600, margin: "0 0 3px" }}>{t("haccp.title")}</h1>
          <div style={{ color: "var(--muted)", fontSize: 13 }}>{t("haccp.subtitle")}</div>
        </div>
        <button className="btn btn-primary" onClick={startAdd}>{t("haccp.newBtn")}</button>
      </div>

      <div className="glass panel" style={{ padding: "16px 20px", marginBottom: 16, borderLeft: "4px solid var(--emerald)" }}>
        <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 14, margin: "0 0 8px" }}>{t("haccp.reqTitle")}</h3>
        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, color: "var(--ink-soft)", lineHeight: 1.7 }}>
          {[0,1,2,3,4].map((i) => <li key={i}>{t(`haccp.req.${i}`)}</li>)}
        </ul>
      </div>

      {showForm && (
        <div className="glass panel" style={{ padding: 24, marginBottom: 16 }}>
          <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 15, margin: "0 0 14px" }}>{editing ? t("haccp.formEdit") : t("haccp.formNew")}</h3>
          {error && <div style={{ background: "var(--brick-soft)", color: "var(--brick)", borderRadius: 6, padding: "8px 12px", fontSize: 12.5, marginBottom: 12 }}>{error}</div>}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px,1fr))", gap: 12 }}>
            {FIELDS.map((f) => (
              <div key={f.key} style={{ gridColumn: f.area ? "1 / -1" : undefined }}>
                <label>{t(`haccp.f.${f.key}`)}</label>
                {f.area
                  ? <textarea rows={f.rows ?? 2} value={form[f.key]} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} placeholder={f.hasPh ? t(`haccp.ph.${f.key}`) : undefined} />
                  : <input value={form[f.key]} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} placeholder={f.hasPh ? t(`haccp.ph.${f.key}`) : undefined} />}
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
            <button className="btn btn-ghost btn-sm" onClick={() => setShowForm(false)}>{t("haccp.cancel")}</button>
            <button className="btn btn-primary btn-sm" onClick={save}>{t("haccp.save")}</button>
          </div>
        </div>
      )}

      <div className="glass panel" style={{ padding: "8px 0" }}>
        {docs.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 0", color: "var(--muted)" }}>{t("haccp.empty")}</div>
        ) : (
          <table>
            <thead><tr><th>{t("haccp.th.number")}</th><th>{t("haccp.th.product")}</th><th>{t("haccp.th.shelf")}</th><th></th></tr></thead>
            <tbody>
              {docs.map((d) => (
                <tr key={d.id}>
                  <td className="num" style={{ color: "var(--muted)", fontSize: 12 }}>{d.docNumber ?? "—"}</td>
                  <td style={{ fontWeight: 600 }}>{d.productName}</td>
                  <td style={{ fontSize: 13 }}>{d.shelfLife ?? "—"}</td>
                  <td style={{ display: "flex", gap: 6 }}>
                    <Link href={`/dashboard/haccp/${d.id}`} className="btn btn-ghost btn-sm">{t("haccp.view")}</Link>
                    <button className="btn btn-ghost btn-sm" onClick={() => startEdit(d)}>✎</button>
                    <button className="btn btn-ghost btn-sm" style={{ color: "var(--brick)" }} onClick={() => remove(d.id)}>×</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
