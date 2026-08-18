"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useT } from "@/components/i18n/I18nProvider";
import { FASHION_BASE_PATH } from "@/lib/fashion/config";

type Row = {
  id: string; sku: string; styleCode: string; styleName: string; color: string; size: string;
  available: number; produced: number; sold: number; reserved: number; gifted: number; marketing: number;
  scrapped: number; unitCost: number; retailPrice: number | null; stockValue: number;
};

export function FinishedGoodsClient({ canManage }: { canManage: boolean }) {
  const t = useT();
  const [rows, setRows] = useState<Row[]>([]);
  const [totals, setTotals] = useState({ cost: 0, retail: 0 });
  const [q, setQ] = useState("");
  const [adj, setAdj] = useState<Row | null>(null);

  async function load() {
    const r = await fetch("/api/fashion/finished-goods");
    if (r.ok) { const j = await r.json(); setRows(j.rows); setTotals({ cost: j.totalCost, retail: j.totalRetail }); }
  }
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => rows.filter((r) => !q || `${r.sku} ${r.styleCode} ${r.styleName} ${r.color}`.toLowerCase().includes(q.toLowerCase())), [rows, q]);
  const th = { textAlign: "left" as const, padding: "7px 8px", color: "var(--muted)", fontSize: 12, whiteSpace: "nowrap" as const };
  const td = { padding: "7px 8px", fontSize: 12.5, borderTop: "1px solid rgba(217,215,200,.5)" };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
        <Link href={FASHION_BASE_PATH} style={{ color: "var(--muted)", textDecoration: "none", fontSize: 13 }}>← {t("fashion.title")}</Link>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 600, margin: 0 }}>{t("fashion.nav.finishedGoods")}</h1>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap", alignItems: "center" }}>
        <input style={{ padding: "6px 9px", fontSize: 12.5, minWidth: 220 }} value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("fashion.fg.search")} />
        <span style={{ marginLeft: "auto", fontSize: 12.5, color: "var(--muted)" }}>
          {t("fashion.fg.stockCost")}: <strong className="num">{totals.cost.toFixed(2)} €</strong> · {t("fashion.fg.retail")}: <strong className="num">{totals.retail.toFixed(2)} €</strong>
        </span>
      </div>

      <div className="glass panel" style={{ overflowX: "auto" }}>
        {filtered.length === 0 ? <div style={{ fontSize: 13, color: "var(--muted)" }}>{t("fashion.fg.empty")}</div> : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr>
              <th style={th}>SKU</th><th style={th}>{t("fashion.styles.name")}</th><th style={th}>{t("fashion.fg.color")}</th><th style={th}>{t("fashion.fg.size")}</th>
              <th style={th}>{t("fashion.fg.available")}</th><th style={th}>{t("fashion.fg.sold")}</th><th style={th}>{t("fashion.fg.reserved")}</th>
              <th style={th}>{t("fashion.fg.unitCost")}</th><th style={th}>{t("fashion.fg.value")}</th>{canManage && <th style={th} />}
            </tr></thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id}>
                  <td style={td} className="num">{r.sku}</td>
                  <td style={td}>{r.styleCode} · {r.styleName}</td>
                  <td style={td}>{r.color || "—"}</td>
                  <td style={td}>{r.size || "—"}</td>
                  <td style={td} className="num"><strong>{r.available}</strong></td>
                  <td style={td} className="num">{r.sold || "—"}</td>
                  <td style={td} className="num">{r.reserved || "—"}</td>
                  <td style={td} className="num">{r.unitCost.toFixed(2)}</td>
                  <td style={td} className="num">{r.stockValue.toFixed(2)}</td>
                  {canManage && <td style={td}><button className="btn btn-ghost btn-sm" style={{ fontSize: 10.5, padding: "2px 8px" }} onClick={() => setAdj(r)}>{t("fashion.fg.adjust")}</button></td>}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {adj && <AdjustModal row={adj} onClose={() => setAdj(null)} onSaved={() => { setAdj(null); load(); }} />}
    </div>
  );
}

function AdjustModal({ row, onClose, onSaved }: { row: Row; onClose: () => void; onSaved: () => void }) {
  const t = useT();
  const [type, setType] = useState("GIFT");
  const [dir, setDir] = useState<"in" | "out">("out");
  const [qty, setQty] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const inp = { padding: "6px 9px", fontSize: 13, width: "100%" } as const;
  const lbl = { fontSize: 11, color: "var(--muted)", display: "block", marginBottom: 2 } as const;

  async function save() {
    if (!(Number(qty) > 0)) { setErr(t("fashion.fg.errQty")); return; }
    setBusy(true); setErr("");
    const body: Record<string, unknown> = { type, quantity: Number(qty) };
    if (type === "ADJUSTMENT") body.direction = dir;
    const r = await fetch(`/api/fashion/finished-goods/${row.id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    if (r.ok) onSaved();
    else setErr(j.insufficient ? t("fashion.fg.insufficient") : (j.error ?? t("fashion.settings.errSave")));
  }

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()} className="glass panel" style={{ maxWidth: 400, width: "100%" }}>
        <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 16, margin: "0 0 4px" }}>{t("fashion.fg.adjust")}</h3>
        <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 10 }} className="num">{row.sku} · {t("fashion.fg.available")}: {row.available}</div>
        {err && <div style={{ color: "var(--brick)", fontSize: 12.5, marginBottom: 8 }}>{err}</div>}
        <div style={{ display: "grid", gap: 10 }}>
          <div><label style={lbl}>{t("fashion.fg.movement")}</label>
            <select style={inp} value={type} onChange={(e) => setType(e.target.value)}>
              {["GIFT", "MARKETING", "SCRAP", "RESERVE", "UNRESERVE", "RETURN", "ADJUSTMENT"].map((x) => <option key={x} value={x}>{t(`fashion.fg.mv_${x}`)}</option>)}
            </select></div>
          {type === "ADJUSTMENT" && (
            <div><label style={lbl}>{t("fashion.fg.direction")}</label>
              <select style={inp} value={dir} onChange={(e) => setDir(e.target.value as "in" | "out")}>
                <option value="in">{t("fashion.fg.dirIn")}</option><option value="out">{t("fashion.fg.dirOut")}</option>
              </select></div>
          )}
          <div><label style={lbl}>{t("fashion.qc.qty")}</label><input type="number" style={inp} value={qty} onChange={(e) => setQty(e.target.value)} /></div>
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 14 }}>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>{t("fashion.materials.cancel")}</button>
          <button className="btn btn-primary btn-sm" disabled={busy} onClick={save}>{t("fashion.fg.apply")}</button>
        </div>
      </div>
    </div>
  );
}
