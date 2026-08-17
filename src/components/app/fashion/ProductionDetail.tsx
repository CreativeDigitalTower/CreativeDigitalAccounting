"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useT } from "@/components/i18n/I18nProvider";
import { FASHION_BASE_PATH } from "@/lib/fashion/config";
import { ProductionStatusBadge } from "@/components/app/fashion/ProductionStatusBadge";
import { ProductionQcPanel } from "@/components/app/fashion/ProductionQcPanel";

type Line = { id: string; size: string; cutQuantity: number };
type Order = {
  id: string; code: string; status: string; color: string | null; productionBatch: string | null; date: string;
  qtyGood: number; qtyDefective: number; qtyRepair: number; qtyReady: number; cut: number; nextStatuses: string[];
  style: { code: string; name: string }; batch: { code: string } | null; lines: Line[];
};

export function ProductionDetail({ id, canManage, canManageQc }: { id: string; canManage: boolean; canManageQc: boolean }) {
  const t = useT();
  const [o, setO] = useState<Order | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function load() { const r = await fetch(`/api/fashion/production/${id}`); if (r.ok) setO(await r.json()); }
  useEffect(() => { load(); }, [id]);
  if (!o) return null;

  async function transition(status: string) {
    setBusy(true); setMsg("");
    const r = await fetch(`/api/fashion/production/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    setBusy(false);
    if (r.ok) load(); else setMsg(`⚠️ ${(await r.json().catch(() => ({}))).error ?? ""}`);
  }

  const dt = (x: string) => new Date(x).toLocaleDateString();
  const Row = ({ l, v }: { l: string; v: React.ReactNode }) => (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 13, padding: "5px 0", borderBottom: "1px solid rgba(217,215,200,.4)" }}>
      <span style={{ color: "var(--muted)" }}>{l}</span><span style={{ textAlign: "right" }}>{v ?? "—"}</span>
    </div>
  );
  const Stat = ({ l, v, c }: { l: string; v: number; c?: string }) => (
    <div className="glass panel" style={{ textAlign: "center", padding: "12px 8px" }}>
      <div className="num" style={{ fontSize: 22, fontWeight: 700, color: c ?? "var(--ink)" }}>{v}</div>
      <div style={{ fontSize: 11, color: "var(--muted)" }}>{l}</div>
    </div>
  );

  return (
    <div style={{ maxWidth: 960 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14, flexWrap: "wrap" }}>
        <Link href={`${FASHION_BASE_PATH}/production`} style={{ color: "var(--muted)", textDecoration: "none", fontSize: 13 }}>← {t("fashion.nav.production")}</Link>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 600, margin: 0 }} className="num">{o.code}</h1>
        <ProductionStatusBadge status={o.status} />
      </div>
      {msg && <div style={{ fontSize: 12.5, marginBottom: 10 }}>{msg}</div>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10, marginBottom: 14 }}>
        <Stat l={t("fashion.prod.cut")} v={o.cut} />
        <Stat l={t("fashion.prod.ready")} v={o.qtyReady} c="var(--emerald-dark,#0F8A6A)" />
        <Stat l={t("fashion.prod.good")} v={o.qtyGood} />
        <Stat l={t("fashion.prod.defective")} v={o.qtyDefective} c="var(--brick)" />
        <Stat l={t("fashion.prod.repair")} v={o.qtyRepair} c="#C08A2D" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
        <div className="glass panel">
          <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 15, margin: "0 0 8px" }}>{t("fashion.materials.info")}</h3>
          <Row l={t("fashion.prod.style")} v={`${o.style.code} · ${o.style.name}`} />
          <Row l={t("fashion.prod.color")} v={o.color} />
          <Row l={t("fashion.prod.cuttingBatch")} v={o.batch?.code} />
          <Row l={t("fashion.prod.productionBatch")} v={o.productionBatch} />
          <Row l={t("fashion.prod.date")} v={dt(o.date)} />
          <div style={{ marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap" }}>
            {o.lines.map((l) => <span key={l.id} style={{ fontSize: 12, background: "rgba(0,0,0,.05)", borderRadius: 10, padding: "3px 10px" }}><strong>{l.size}</strong>: {l.cutQuantity}</span>)}
          </div>
        </div>

        <div className="glass panel">
          <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 15, margin: "0 0 8px" }}>{t("fashion.prod.workflow")}</h3>
          <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", fontSize: 11.5, color: "var(--muted)", marginBottom: 10 }}>
            {["cut", "sewing", "finishing", "qc", "ready"].map((s, i) => (
              <span key={s} style={{ fontWeight: o.status === s ? 700 : 400, color: o.status === s ? "var(--ink)" : "var(--muted)" }}>
                {i > 0 && "→ "}{t(`fashion.prod.st_${s}`)}
              </span>
            ))}
          </div>
          {canManage ? (
            o.nextStatuses.length === 0 ? <div style={{ fontSize: 12.5, color: "var(--muted)" }}>{t("fashion.prod.noTransitions")}</div> : (
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {o.nextStatuses.map((s) => (
                  <button key={s} className="btn btn-ghost btn-sm" disabled={busy} onClick={() => transition(s)} style={{ fontSize: 11.5 }}>
                    → {t(`fashion.prod.st_${s}`)}
                  </button>
                ))}
              </div>
            )
          ) : <div style={{ fontSize: 12.5, color: "var(--muted)" }}>{t("fashion.prod.readOnly")}</div>}
          <p style={{ fontSize: 10.5, color: "var(--muted)", marginTop: 10 }}>{t("fashion.prod.countsHint")}</p>
        </div>
      </div>

      <ProductionQcPanel orderId={id} canManage={canManageQc} onChange={load} />
    </div>
  );
}
