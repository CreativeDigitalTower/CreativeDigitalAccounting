"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useT } from "@/components/i18n/I18nProvider";
import { FASHION_BASE_PATH } from "@/lib/fashion/config";
import { SERIAL_STATUSES, formatSerial } from "@/lib/fashion/serialization";

type Unit = { id: string; serial: number; color: string | null; size: string | null; productionBatch: string | null; status: string };
type Data = {
  style: { id: string; code: string; name: string; serialized: boolean; editionSize: number | null; colors: string[]; sizes: string[] };
  units: Unit[]; counts: Record<string, number>; issued: number; remaining: number;
};

export function SerialsEditor({ styleId, canManageStyles, canManageProd }: { styleId: string; canManageStyles: boolean; canManageProd: boolean }) {
  const t = useT();
  const [d, setD] = useState<Data | null>(null);
  const [edition, setEdition] = useState("");
  const [gen, setGen] = useState({ count: "1", color: "", size: "", productionBatch: "" });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    const r = await fetch(`/api/fashion/serials?styleId=${styleId}`);
    if (r.ok) { const j = await r.json(); setD(j); setEdition(j.style.editionSize ? String(j.style.editionSize) : ""); }
  }, [styleId]);
  useEffect(() => { load(); }, [load]);
  if (!d) return null;

  async function enable(on: boolean) {
    setBusy(true); setMsg("");
    await fetch(`/api/fashion/styles/${styleId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ serialized: on, editionSize: edition ? Number(edition) : null }) });
    setBusy(false); load();
  }
  async function saveEdition() {
    setBusy(true);
    await fetch(`/api/fashion/styles/${styleId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ editionSize: edition ? Number(edition) : null }) });
    setBusy(false); load();
  }
  async function generate() {
    setBusy(true); setMsg("");
    const r = await fetch("/api/fashion/serials", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ styleId, count: Number(gen.count) || 1, color: gen.color || null, size: gen.size || null, productionBatch: gen.productionBatch || null }) });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    if (r.ok) { setMsg(`✅ ${t("fashion.serial.generated", { n: String(j.created) })}`); load(); } else setMsg(`⚠️ ${j.error ?? ""}`);
  }
  async function setStatus(id: string, status: string) { setBusy(true); await fetch(`/api/fashion/serials/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) }); setBusy(false); load(); }

  const th = { textAlign: "left" as const, padding: "6px 8px", color: "var(--muted)", fontSize: 11.5, whiteSpace: "nowrap" as const };
  const td = { padding: "6px 8px", fontSize: 12.5, borderTop: "1px solid rgba(217,215,200,.5)" };
  const inp = { padding: "5px 8px", fontSize: 12.5 } as const;

  return (
    <div style={{ maxWidth: 920 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12, flexWrap: "wrap" }}>
        <Link href={`${FASHION_BASE_PATH}/styles/${styleId}`} style={{ color: "var(--muted)", textDecoration: "none", fontSize: 13 }}>← {d.style.code}</Link>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 600, margin: 0 }}>{t("fashion.serial.title")}</h1>
      </div>
      {msg && <div style={{ fontSize: 12.5, marginBottom: 10 }}>{msg}</div>}

      {!d.style.serialized ? (
        <div className="glass panel">
          <p style={{ fontSize: 13, marginBottom: 10 }}>{t("fashion.serial.notEnabled")}</p>
          {canManageStyles && (
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <label style={{ fontSize: 12.5 }}>{t("fashion.serial.editionSize")}: <input type="number" style={{ ...inp, width: 90, marginLeft: 6 }} value={edition} onChange={(e) => setEdition(e.target.value)} placeholder="100" /></label>
              <button className="btn btn-primary btn-sm" disabled={busy} onClick={() => enable(true)}>{t("fashion.serial.enable")}</button>
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="glass panel" style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap", marginBottom: 12 }}>
            <div style={{ fontSize: 13 }}>{t("fashion.serial.edition")}: <strong className="num">{d.style.editionSize ?? "∞"}</strong> · {t("fashion.serial.issued")}: <strong className="num">{d.issued}</strong> · {t("fashion.serial.remaining")}: <strong className="num">{d.remaining === Infinity ? "∞" : d.remaining}</strong></div>
            {canManageStyles && (
              <div style={{ marginLeft: "auto", display: "flex", gap: 6, alignItems: "center" }}>
                <input type="number" style={{ ...inp, width: 80 }} value={edition} onChange={(e) => setEdition(e.target.value)} />
                <button className="btn btn-ghost btn-sm" disabled={busy} onClick={saveEdition}>{t("fashion.serial.saveEdition")}</button>
                <button className="btn btn-ghost btn-sm" disabled={busy} onClick={() => enable(false)} style={{ color: "var(--brick)" }}>{t("fashion.serial.disable")}</button>
              </div>
            )}
          </div>

          <div className="glass panel" style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 12 }}>
            {SERIAL_STATUSES.map((s) => <span key={s} style={{ fontSize: 12, background: "rgba(0,0,0,.05)", borderRadius: 10, padding: "3px 10px" }}>{t(`fashion.serial.st_${s}`)}: <strong className="num">{d.counts[s]}</strong></span>)}
          </div>

          {canManageProd && d.remaining > 0 && (
            <div className="glass panel" style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", marginBottom: 12 }}>
              <strong style={{ fontSize: 12.5 }}>{t("fashion.serial.generate")}:</strong>
              <input type="number" style={{ ...inp, width: 70 }} value={gen.count} onChange={(e) => setGen({ ...gen, count: e.target.value })} placeholder={t("fashion.serial.count")} />
              <select style={inp} value={gen.color} onChange={(e) => setGen({ ...gen, color: e.target.value })}><option value="">{t("fashion.serial.color")}</option>{d.style.colors.map((c) => <option key={c} value={c}>{c}</option>)}</select>
              <select style={inp} value={gen.size} onChange={(e) => setGen({ ...gen, size: e.target.value })}><option value="">{t("fashion.serial.size")}</option>{d.style.sizes.map((s) => <option key={s} value={s}>{s}</option>)}</select>
              <input style={{ ...inp, width: 110 }} value={gen.productionBatch} onChange={(e) => setGen({ ...gen, productionBatch: e.target.value })} placeholder={t("fashion.serial.batch")} />
              <button className="btn btn-primary btn-sm" disabled={busy} onClick={generate}>{t("fashion.serial.generateBtn")}</button>
            </div>
          )}

          <div className="glass panel" style={{ overflowX: "auto" }}>
            {d.units.length === 0 ? <div style={{ fontSize: 12.5, color: "var(--muted)" }}>{t("fashion.serial.noUnits")}</div> : (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr>
                  <th style={th}>№</th><th style={th}>{t("fashion.serial.color")}</th><th style={th}>{t("fashion.serial.size")}</th><th style={th}>{t("fashion.serial.batch")}</th><th style={th}>{t("fashion.styles.status")}</th>
                </tr></thead>
                <tbody>
                  {d.units.map((u) => (
                    <tr key={u.id}>
                      <td style={td} className="num"><strong>{formatSerial(u.serial, d.style.editionSize)}</strong></td>
                      <td style={td}>{u.color ?? "—"}</td><td style={td}>{u.size ?? "—"}</td><td style={td}>{u.productionBatch ?? "—"}</td>
                      <td style={td}>
                        {canManageProd
                          ? <select style={inp} value={u.status} disabled={busy} onChange={(e) => setStatus(u.id, e.target.value)}>{SERIAL_STATUSES.map((s) => <option key={s} value={s}>{t(`fashion.serial.st_${s}`)}</option>)}</select>
                          : t(`fashion.serial.st_${u.status}`)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}
