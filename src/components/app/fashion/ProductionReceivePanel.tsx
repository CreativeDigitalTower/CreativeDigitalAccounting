"use client";
import { useState } from "react";
import { useT } from "@/components/i18n/I18nProvider";

type Line = { id: string; size: string; cutQuantity: number };
export function ProductionReceivePanel({ orderId, lines, color, colors, remaining, onChange }: {
  orderId: string; lines: Line[]; color: string | null; colors: string[]; remaining: number; onChange: () => void;
}) {
  const t = useT();
  const [qty, setQty] = useState<Record<string, string>>({});
  const [col, setCol] = useState(color ?? "");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const total = Object.values(qty).reduce((s, q) => s + (Number(q) || 0), 0);
  const inp = { padding: "5px 8px", fontSize: 12.5 } as const;

  async function receive() {
    const rl = lines.map((l) => ({ size: l.size, quantity: Number(qty[l.size]) || 0 })).filter((l) => l.quantity > 0);
    if (!rl.length) { setMsg(`⚠️ ${t("fashion.fg.errReceive")}`); return; }
    setBusy(true); setMsg("");
    const r = await fetch(`/api/fashion/production/${orderId}/receive`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ color: col || null, lines: rl }) });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    if (r.ok) { setQty({}); setMsg(`✅ ${t("fashion.fg.received", { n: String(j.received) })}`); onChange(); }
    else setMsg(`⚠️ ${j.error ?? t("fashion.settings.errSave")}`);
  }

  return (
    <div className="glass panel">
      <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 15, margin: "0 0 4px" }}>{t("fashion.fg.receiveTitle")}</h3>
      <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 10 }}>{t("fashion.fg.remaining", { n: String(remaining) })}</div>
      {msg && <div style={{ fontSize: 12.5, marginBottom: 8 }}>{msg}</div>}
      {remaining <= 0 ? <div style={{ fontSize: 12.5, color: "var(--muted)" }}>{t("fashion.fg.allReceived")}</div> : (
        <>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 10 }}>
            <label style={{ fontSize: 12 }}>{t("fashion.fg.color")}:
              <select style={{ ...inp, marginLeft: 6 }} value={col} onChange={(e) => setCol(e.target.value)}>
                <option value="">—</option>{colors.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
            <div style={{ marginLeft: "auto", fontSize: 12.5 }}>{t("fashion.fg.toReceive")}: <strong className="num">{total}</strong></div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(80px,1fr))", gap: 8, marginBottom: 10 }}>
            {lines.map((l) => (
              <div key={l.id}><label style={{ fontSize: 11, color: "var(--muted)", display: "block" }}>{l.size} <span style={{ opacity: .6 }}>({l.cutQuantity})</span></label>
                <input type="number" style={{ ...inp, width: "100%" }} value={qty[l.size] ?? ""} onChange={(e) => setQty({ ...qty, [l.size]: e.target.value })} /></div>
            ))}
          </div>
          <button className="btn btn-primary btn-sm" disabled={busy || total <= 0} onClick={receive}>{t("fashion.fg.receiveBtn")}</button>
        </>
      )}
    </div>
  );
}
