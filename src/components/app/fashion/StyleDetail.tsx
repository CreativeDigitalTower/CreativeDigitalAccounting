"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useT } from "@/components/i18n/I18nProvider";
import { FASHION_BASE_PATH } from "@/lib/fashion/config";
import { STYLE_STATUSES } from "@/lib/fashion/styles";
import { StatusBadge } from "@/components/app/fashion/StatusBadge";

type Photo = { id: string; url: string; kind: string; caption: string | null };
type Pattern = {
  id: string; version: number; size: string | null; hasPaper: boolean; hasDigital: boolean; hasMarker: boolean;
  fileUrl: string | null; fileName: string | null; status: string; author: string | null; note: string | null; createdAt: string;
};
type Style = {
  id: string; code: string; name: string; collection: string | null; category: string | null; season: string | null;
  year: number | null; description: string | null; status: string; photoUrl: string | null; skuPrefix: string | null;
  colors: string[]; sizes: string[]; note: string | null; photos: Photo[]; patterns: Pattern[];
};

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result as string); r.onerror = rej; r.readAsDataURL(file); });
}

export function StyleDetail({ id, canManageStyles, canManagePatterns }: { id: string; canManageStyles: boolean; canManagePatterns: boolean }) {
  const t = useT();
  const [s, setS] = useState<Style | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const photoInput = useRef<HTMLInputElement>(null);

  async function load() { const r = await fetch(`/api/fashion/styles/${id}`); if (r.ok) setS(await r.json()); }
  useEffect(() => { load(); }, [id]);
  if (!s) return null;

  async function patch(body: Record<string, unknown>, ok = "") {
    setBusy(true); setMsg("");
    const r = await fetch(`/api/fashion/styles/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    setBusy(false);
    if (r.ok) { if (ok) setMsg(`✅ ${ok}`); load(); }
    else setMsg(`⚠️ ${(await r.json().catch(() => ({}))).error ?? t("fashion.settings.errSave")}`);
  }

  async function uploadPhoto(file: File, kind: string) {
    if (file.size > 2_500_000) { setMsg(`⚠️ ${t("fashion.styles.photoTooLarge")}`); return; }
    const url = await fileToDataUrl(file);
    setBusy(true);
    const r = await fetch(`/api/fashion/styles/${id}/photos`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url, kind }) });
    setBusy(false);
    if (r.ok) load();
  }
  async function deletePhoto(photoId: string) {
    setBusy(true);
    await fetch(`/api/fashion/styles/${id}/photos?photoId=${photoId}`, { method: "DELETE" });
    setBusy(false); load();
  }

  const th = { textAlign: "left" as const, padding: "6px 8px", color: "var(--muted)", fontSize: 11.5, whiteSpace: "nowrap" as const };
  const td = { padding: "6px 8px", fontSize: 12.5, borderTop: "1px solid rgba(217,215,200,.5)" };
  const Row = ({ l, v }: { l: string; v: React.ReactNode }) => (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 13, padding: "5px 0", borderBottom: "1px solid rgba(217,215,200,.4)" }}>
      <span style={{ color: "var(--muted)" }}>{l}</span><span style={{ textAlign: "right" }}>{v ?? "—"}</span>
    </div>
  );

  return (
    <div style={{ maxWidth: 1040 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14, flexWrap: "wrap" }}>
        <Link href={`${FASHION_BASE_PATH}/styles`} style={{ color: "var(--muted)", textDecoration: "none", fontSize: 13 }}>← {t("fashion.nav.styles")}</Link>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 600, margin: 0 }} className="num">{s.code}</h1>
        <span style={{ fontSize: 14 }}>{s.name}</span>
        <StatusBadge status={s.status} />
        <Link href={`${FASHION_BASE_PATH}/styles/${id}/bom`} className="btn btn-ghost btn-sm" style={{ fontSize: 11 }}>{t("fashion.nav.bom")}</Link>
        {canManageStyles && (
          <select style={{ marginLeft: "auto", padding: "5px 8px", fontSize: 12.5 }} value={s.status} disabled={busy}
            onChange={(e) => patch({ status: e.target.value }, t("fashion.styles.statusChanged"))}>
            {STYLE_STATUSES.map((st) => <option key={st} value={st}>{t(`fashion.status.${st}`)}</option>)}
          </select>
        )}
      </div>
      {msg && <div style={{ fontSize: 12.5, marginBottom: 10 }}>{msg}</div>}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
        <div className="glass panel">
          <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 15, margin: "0 0 8px" }}>{t("fashion.materials.info")}</h3>
          <Row l={t("fashion.styles.collection")} v={s.collection} />
          <Row l={t("fashion.styles.category")} v={s.category} />
          <Row l={t("fashion.styles.season")} v={[s.season, s.year].filter(Boolean).join(" ")} />
          <Row l={t("fashion.styles.skuPrefix")} v={s.skuPrefix} />
          <Row l={t("fashion.styles.colors")} v={s.colors.join(", ")} />
          <Row l={t("fashion.styles.sizes")} v={s.sizes.join(", ")} />
          <Row l={t("fashion.styles.description")} v={s.description} />
        </div>

        <div className="glass panel">
          <div style={{ display: "flex", alignItems: "center", marginBottom: 8 }}>
            <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 15, margin: 0 }}>{t("fashion.styles.photos")}</h3>
            {canManageStyles && (
              <>
                <button className="btn btn-ghost btn-sm" style={{ marginLeft: "auto", fontSize: 11 }} disabled={busy} onClick={() => photoInput.current?.click()}>{t("fashion.styles.addPhoto")}</button>
                <input ref={photoInput} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadPhoto(f, "product"); e.target.value = ""; }} />
              </>
            )}
          </div>
          {s.photos.length === 0 ? <div style={{ fontSize: 12.5, color: "var(--muted)" }}>{t("fashion.styles.noPhotos")}</div> : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(80px,1fr))", gap: 8 }}>
              {s.photos.map((p) => (
                <div key={p.id} style={{ position: "relative" }}>
                  <img src={p.url} alt="" style={{ width: "100%", aspectRatio: "1", objectFit: "cover", borderRadius: 8, border: s.photoUrl === p.url ? "2px solid var(--emerald)" : "1px solid var(--border)" }} />
                  {canManageStyles && (
                    <div style={{ display: "flex", gap: 3, marginTop: 3 }}>
                      <button className="btn btn-ghost btn-sm" style={{ fontSize: 9, padding: "1px 5px", flex: 1 }} disabled={busy} onClick={() => patch({ photoUrl: p.url })}>{t("fashion.styles.main")}</button>
                      <button className="btn btn-ghost btn-sm" style={{ fontSize: 9, padding: "1px 5px", color: "var(--brick)" }} disabled={busy} onClick={() => deletePhoto(p.id)}>✕</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="glass panel" style={{ overflowX: "auto" }}>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 8 }}>
          <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 15, margin: 0 }}>{t("fashion.patterns.versions")}</h3>
        </div>
        {s.patterns.length === 0 ? <div style={{ fontSize: 12.5, color: "var(--muted)", marginBottom: 8 }}>{t("fashion.patterns.none")}</div> : (
          <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 10 }}>
            <thead><tr>
              <th style={th}>{t("fashion.patterns.version")}</th><th style={th}>{t("fashion.patterns.size")}</th><th style={th}>{t("fashion.patterns.paper")}</th>
              <th style={th}>{t("fashion.patterns.digital")}</th><th style={th}>{t("fashion.patterns.marker")}</th><th style={th}>{t("fashion.patterns.file")}</th>
              <th style={th}>{t("fashion.patterns.author")}</th><th style={th}>{t("fashion.styles.status")}</th><th style={th} />
            </tr></thead>
            <tbody>
              {s.patterns.map((p) => (
                <tr key={p.id}>
                  <td style={td} className="num"><strong>V{p.version}</strong></td>
                  <td style={td}>{p.size ?? "—"}</td>
                  <td style={td}>{p.hasPaper ? "✓" : "—"}</td>
                  <td style={td}>{p.hasDigital ? "✓" : "—"}</td>
                  <td style={td}>{p.hasMarker ? "✓" : "—"}</td>
                  <td style={td}>{p.fileUrl ? <a href={p.fileUrl} download={p.fileName ?? "pattern"} target="_blank" rel="noreferrer">{t("fashion.patterns.download")}</a> : "—"}</td>
                  <td style={td}>{p.author ?? "—"}</td>
                  <td style={td}><StatusBadge status={p.status} ns="patternStatus" /></td>
                  <td style={td}>
                    {canManagePatterns && p.status !== "approved" && <button className="btn btn-ghost btn-sm" style={{ fontSize: 10, padding: "2px 6px" }} disabled={busy} onClick={() => patchPattern(p.id, { status: "approved" })}>{t("fashion.patterns.approve")}</button>}
                    {canManagePatterns && p.status !== "archived" && <button className="btn btn-ghost btn-sm" style={{ fontSize: 10, padding: "2px 6px", marginLeft: 4 }} disabled={busy} onClick={() => patchPattern(p.id, { status: "archived" })}>{t("fashion.patterns.archive")}</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {canManagePatterns && <NewPatternVersion styleId={id} onSaved={load} />}
      </div>
    </div>
  );

  async function patchPattern(patternId: string, body: Record<string, unknown>) {
    setBusy(true);
    await fetch(`/api/fashion/patterns/${patternId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    setBusy(false); load();
  }
}

function NewPatternVersion({ styleId, onSaved }: { styleId: string; onSaved: () => void }) {
  const t = useT();
  const [f, setF] = useState({ size: "", hasPaper: false, hasDigital: false, hasMarker: false, author: "", note: "" });
  const [file, setFile] = useState<{ url: string; name: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const f0 = e.target.files?.[0]; if (!f0) return;
    if (f0.size > 4_000_000) { alert(t("fashion.styles.photoTooLarge")); return; }
    setFile({ url: await fileToDataUrl(f0), name: f0.name }); e.target.value = "";
  }
  async function save() {
    setBusy(true);
    const r = await fetch("/api/fashion/patterns", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ styleId, size: f.size || null, hasPaper: f.hasPaper, hasDigital: f.hasDigital, hasMarker: f.hasMarker, author: f.author || null, note: f.note || null, fileUrl: file?.url ?? null, fileName: file?.name ?? null }),
    });
    setBusy(false);
    if (r.ok) { setF({ size: "", hasPaper: false, hasDigital: false, hasMarker: false, author: "", note: "" }); setFile(null); onSaved(); }
  }

  const inp = { padding: "5px 8px", fontSize: 12.5 } as const;
  return (
    <div style={{ borderTop: "1px solid var(--border)", paddingTop: 10, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
      <strong style={{ fontSize: 12.5 }}>{t("fashion.patterns.newVersion")}:</strong>
      <input style={{ ...inp, width: 80 }} placeholder={t("fashion.patterns.size")} value={f.size} onChange={(e) => setF({ ...f, size: e.target.value })} />
      <label style={{ fontSize: 12 }}><input type="checkbox" checked={f.hasPaper} onChange={(e) => setF({ ...f, hasPaper: e.target.checked })} /> {t("fashion.patterns.paper")}</label>
      <label style={{ fontSize: 12 }}><input type="checkbox" checked={f.hasDigital} onChange={(e) => setF({ ...f, hasDigital: e.target.checked })} /> {t("fashion.patterns.digital")}</label>
      <label style={{ fontSize: 12 }}><input type="checkbox" checked={f.hasMarker} onChange={(e) => setF({ ...f, hasMarker: e.target.checked })} /> {t("fashion.patterns.marker")}</label>
      <input style={{ ...inp, width: 120 }} placeholder={t("fashion.patterns.author")} value={f.author} onChange={(e) => setF({ ...f, author: e.target.value })} />
      <label className="btn btn-ghost btn-sm" style={{ fontSize: 11 }}>{file ? "✓ " + file.name.slice(0, 14) : t("fashion.patterns.file")}<input type="file" hidden onChange={pick} /></label>
      <button className="btn btn-primary btn-sm" disabled={busy} onClick={save}>{t("fashion.patterns.addVersion")}</button>
    </div>
  );
}
