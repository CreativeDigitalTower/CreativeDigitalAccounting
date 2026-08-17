"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useT } from "@/components/i18n/I18nProvider";
import { FASHION_BASE_PATH } from "@/lib/fashion/config";
import { STYLE_STATUSES } from "@/lib/fashion/styles";
import { StatusBadge } from "@/components/app/fashion/StatusBadge";

type Style = {
  id: string; code: string; name: string; collection: string | null; category: string | null;
  season: string | null; year: number | null; status: string; photoUrl: string | null;
  colors: string[]; sizes: string[]; patternCount: number;
};

export function StylesClient({ canManage }: { canManage: boolean }) {
  const t = useT();
  const [rows, setRows] = useState<Style[]>([]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [open, setOpen] = useState(false);

  async function load() {
    const p = new URLSearchParams();
    if (status) p.set("status", status);
    if (q) p.set("q", q);
    const r = await fetch(`/api/fashion/styles?${p}`);
    if (r.ok) setRows(await r.json());
  }
  useEffect(() => { const id = setTimeout(load, 200); return () => clearTimeout(id); }, [q, status]);

  const th = { textAlign: "left" as const, padding: "7px 8px", color: "var(--muted)", fontSize: 12, whiteSpace: "nowrap" as const };
  const td = { padding: "7px 8px", fontSize: 12.5, borderTop: "1px solid rgba(217,215,200,.5)" };
  const sel = { padding: "6px 9px", fontSize: 12.5 } as const;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
        <Link href={FASHION_BASE_PATH} style={{ color: "var(--muted)", textDecoration: "none", fontSize: 13 }}>← {t("fashion.title")}</Link>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 600, margin: 0 }}>{t("fashion.nav.styles")}</h1>
        {canManage && <button className="btn btn-primary btn-sm" style={{ marginLeft: "auto" }} onClick={() => setOpen(true)}>{t("fashion.styles.add")}</button>}
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        <input style={{ ...sel, minWidth: 220 }} value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("fashion.styles.search")} />
        <select style={sel} value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">{t("fashion.styles.allStatuses")}</option>
          {STYLE_STATUSES.map((s) => <option key={s} value={s}>{t(`fashion.status.${s}`)}</option>)}
        </select>
      </div>

      <div className="glass panel" style={{ overflowX: "auto" }}>
        {rows.length === 0 ? <div style={{ fontSize: 13, color: "var(--muted)" }}>{t("fashion.styles.empty")}</div> : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr>
              <th style={th} /><th style={th}>{t("fashion.styles.code")}</th><th style={th}>{t("fashion.styles.name")}</th>
              <th style={th}>{t("fashion.styles.collection")}</th><th style={th}>{t("fashion.styles.colors")}</th><th style={th}>{t("fashion.styles.sizes")}</th>
              <th style={th}>{t("fashion.styles.patterns")}</th><th style={th}>{t("fashion.styles.status")}</th>
            </tr></thead>
            <tbody>
              {rows.map((s) => (
                <tr key={s.id}>
                  <td style={td}>{s.photoUrl ? <img src={s.photoUrl} alt="" style={{ width: 34, height: 34, objectFit: "cover", borderRadius: 6 }} /> : <div style={{ width: 34, height: 34, borderRadius: 6, background: "rgba(0,0,0,.06)" }} />}</td>
                  <td style={td}><Link href={`${FASHION_BASE_PATH}/styles/${s.id}`} style={{ fontWeight: 600 }} className="num">{s.code}</Link></td>
                  <td style={td}>{s.name}</td>
                  <td style={td}>{s.collection ?? "—"}</td>
                  <td style={td}>{s.colors.length}</td>
                  <td style={td}>{s.sizes.join(", ") || "—"}</td>
                  <td style={td} className="num">{s.patternCount}</td>
                  <td style={td}><StatusBadge status={s.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {open && <NewStyle onClose={() => setOpen(false)} onSaved={() => { setOpen(false); load(); }} />}
    </div>
  );
}

function NewStyle({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const t = useT();
  const [f, setF] = useState({ code: "", name: "", collection: "", category: "", season: "", year: "", skuPrefix: "", colors: "", sizes: "", description: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const inp = { padding: "6px 9px", fontSize: 13, width: "100%" } as const;
  const lbl = { fontSize: 11, color: "var(--muted)", display: "block", marginBottom: 2 } as const;

  async function save() {
    if (!f.code.trim() || !f.name.trim()) { setErr(t("fashion.styles.errRequired")); return; }
    setBusy(true); setErr("");
    const r = await fetch("/api/fashion/styles", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: f.code, name: f.name, collection: f.collection || null, category: f.category || null,
        season: f.season || null, year: f.year ? Number(f.year) : null, skuPrefix: f.skuPrefix || null,
        colors: f.colors || null, sizes: f.sizes || null, description: f.description || null,
      }),
    });
    setBusy(false);
    if (r.ok) onSaved();
    else setErr((await r.json().catch(() => ({}))).error ?? t("fashion.settings.errSave"));
  }

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()} className="glass panel" style={{ maxWidth: 560, width: "100%", maxHeight: "92vh", overflowY: "auto" }}>
        <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 17, margin: "0 0 12px" }}>{t("fashion.styles.add")}</h3>
        {err && <div style={{ color: "var(--brick)", fontSize: 12.5, marginBottom: 8 }}>{err}</div>}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div><label style={lbl}>{t("fashion.styles.code")} *</label><input style={inp} value={f.code} onChange={(e) => setF({ ...f, code: e.target.value })} placeholder="EX-SPO-DR-001" /></div>
          <div><label style={lbl}>{t("fashion.styles.name")} *</label><input style={inp} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
          <div><label style={lbl}>{t("fashion.styles.collection")}</label><input style={inp} value={f.collection} onChange={(e) => setF({ ...f, collection: e.target.value })} /></div>
          <div><label style={lbl}>{t("fashion.styles.category")}</label><input style={inp} value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })} /></div>
          <div><label style={lbl}>{t("fashion.styles.season")}</label><input style={inp} value={f.season} onChange={(e) => setF({ ...f, season: e.target.value })} /></div>
          <div><label style={lbl}>{t("fashion.styles.year")}</label><input type="number" style={inp} value={f.year} onChange={(e) => setF({ ...f, year: e.target.value })} /></div>
          <div><label style={lbl}>{t("fashion.styles.skuPrefix")}</label><input style={inp} value={f.skuPrefix} onChange={(e) => setF({ ...f, skuPrefix: e.target.value })} placeholder="EX-SD" /></div>
          <div />
          <div><label style={lbl}>{t("fashion.styles.colors")}</label><input style={inp} value={f.colors} onChange={(e) => setF({ ...f, colors: e.target.value })} placeholder="Black, White" /></div>
          <div><label style={lbl}>{t("fashion.styles.sizes")}</label><input style={inp} value={f.sizes} onChange={(e) => setF({ ...f, sizes: e.target.value })} placeholder="XS, S, M, L, XL" /></div>
          <div style={{ gridColumn: "1 / -1" }}><label style={lbl}>{t("fashion.styles.description")}</label><input style={inp} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></div>
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 12 }}>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>{t("fashion.materials.cancel")}</button>
          <button className="btn btn-primary btn-sm" disabled={busy} onClick={save}>{t("fashion.materials.save")}</button>
        </div>
      </div>
    </div>
  );
}
