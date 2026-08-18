"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useT } from "@/components/i18n/I18nProvider";
import { FASHION_BASE_PATH } from "@/lib/fashion/config";

type Margins = { grossProfit: number; grossMarginPct: number; markupPct: number };
type Data = {
  style: { code: string; name: string; sizes: string[]; colors: string[] };
  directMaterials: number; packaging: number; minutes: number; labor: number; overhead: number; overheadMethod: string;
  manufacturing: number; commercialTotal: number; fullyLoaded: number;
  retailPrice: number | null; sellingPrice: number | null;
  marginsManufacturing: Margins; marginsLoaded: Margins;
};

export function StyleCostingEditor({ styleId, canManage }: { styleId: string; canManage: boolean }) {
  const t = useT();
  const [d, setD] = useState<Data | null>(null);
  const [size, setSize] = useState("");
  const [color, setColor] = useState("");
  const [f, setF] = useState({ retailPrice: "", sellingPrice: "", marketingAlloc: "", paymentFees: "", fulfillment: "", returnsAllowance: "", logistics: "", otherAlloc: "" });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    const p = new URLSearchParams({ styleId }); if (size) p.set("size", size); if (color) p.set("color", color);
    const r = await fetch(`/api/fashion/costing?${p}`);
    if (r.ok) setD(await r.json());
  }, [styleId, size, color]);
  useEffect(() => { load(); }, [load]);

  // Зарежда конфигурацията в полетата веднъж.
  useEffect(() => {
    (async () => {
      const r = await fetch(`/api/fashion/costing?styleId=${styleId}`);
      if (r.ok) { const j = await r.json(); const c = j.commercial ?? {}; setF((s) => ({ ...s, retailPrice: j.retailPrice ?? "", sellingPrice: j.sellingPrice ?? "", marketingAlloc: c.marketing ? String(c.marketing) : "", paymentFees: c.paymentFees ? String(c.paymentFees) : "", fulfillment: c.fulfillment ? String(c.fulfillment) : "", returnsAllowance: c.returnsAllowance ? String(c.returnsAllowance) : "", logistics: c.logistics ? String(c.logistics) : "", otherAlloc: c.other ? String(c.other) : "" })); }
    })();
  }, [styleId]);
  if (!d) return null;

  async function save() {
    setBusy(true); setMsg("");
    const num = (v: string) => v === "" ? null : Number(v);
    const r = await fetch("/api/fashion/costing", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        styleId, retailPrice: num(f.retailPrice), sellingPrice: num(f.sellingPrice),
        marketingAlloc: Number(f.marketingAlloc) || 0, paymentFees: Number(f.paymentFees) || 0, fulfillment: Number(f.fulfillment) || 0,
        returnsAllowance: Number(f.returnsAllowance) || 0, logistics: Number(f.logistics) || 0, otherAlloc: Number(f.otherAlloc) || 0,
      }),
    });
    setBusy(false);
    setMsg(r.ok ? `✅ ${t("fashion.cost.saved")}` : `⚠️ ${t("fashion.settings.errSave")}`);
    if (r.ok) load();
  }

  const inp = { padding: "5px 8px", fontSize: 12.5 } as const;
  const lbl = { fontSize: 11, color: "var(--muted)", display: "block", marginBottom: 2 } as const;
  const Row = ({ l, v, strong }: { l: string; v: string; strong?: boolean }) => (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "5px 0", borderBottom: "1px solid rgba(217,215,200,.4)", fontWeight: strong ? 700 : 400 }}>
      <span style={{ color: strong ? "var(--ink)" : "var(--muted)" }}>{l}</span><span className="num">{v}</span>
    </div>
  );
  const M = (m: Margins) => `${m.grossProfit.toFixed(2)} € · ${m.grossMarginPct}% / ${m.markupPct}%`;

  return (
    <div style={{ maxWidth: 900 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12, flexWrap: "wrap" }}>
        <Link href={`${FASHION_BASE_PATH}/styles/${styleId}`} style={{ color: "var(--muted)", textDecoration: "none", fontSize: 13 }}>← {d.style.code}</Link>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 600, margin: 0 }}>{t("fashion.nav.costing")}</h1>
      </div>
      {msg && <div style={{ fontSize: 12.5, marginBottom: 10 }}>{msg}</div>}

      <div className="glass panel" style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", marginBottom: 12 }}>
        <span style={{ fontSize: 12.5 }}>{t("fashion.bom.variant")}:</span>
        <select style={inp} value={size} onChange={(e) => setSize(e.target.value)}><option value="">{t("fashion.bom.baseSize")}</option>{d.style.sizes.map((s) => <option key={s} value={s}>{s}</option>)}</select>
        <select style={inp} value={color} onChange={(e) => setColor(e.target.value)}><option value="">{t("fashion.bom.anyColor")}</option>{d.style.colors.map((c) => <option key={c} value={c}>{c}</option>)}</select>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <div className="glass panel">
          <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 15, margin: "0 0 8px" }}>{t("fashion.cost.breakdown")}</h3>
          <Row l={t("fashion.cost.directMaterials")} v={`${d.directMaterials.toFixed(2)} €`} />
          <Row l={t("fashion.cost.packaging")} v={`${d.packaging.toFixed(2)} €`} />
          <Row l={`${t("fashion.cost.labor")} (${d.minutes} ${t("fashion.ops.min")})`} v={`${d.labor.toFixed(2)} €`} />
          <Row l={`${t("fashion.cost.overhead")} (${t(`fashion.settings.${d.overheadMethod === "percent_labor" ? "percentLabor" : "perUnit"}`)})`} v={`${d.overhead.toFixed(2)} €`} />
          <Row l={t("fashion.cost.manufacturing")} v={`${d.manufacturing.toFixed(2)} €`} strong />
          <Row l={t("fashion.cost.commercial")} v={`${d.commercialTotal.toFixed(2)} €`} />
          <Row l={t("fashion.cost.fullyLoaded")} v={`${d.fullyLoaded.toFixed(2)} €`} strong />
          <div style={{ marginTop: 10, fontSize: 12.5 }}>
            <div>{t("fashion.cost.marginMfg")}: <strong className="num">{M(d.marginsManufacturing)}</strong></div>
            <div style={{ marginTop: 2 }}>{t("fashion.cost.marginLoaded")}: <strong className="num">{M(d.marginsLoaded)}</strong></div>
            <div style={{ fontSize: 10.5, color: "var(--muted)", marginTop: 4 }}>{t("fashion.cost.marginHint")}</div>
          </div>
        </div>

        <div className="glass panel">
          <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 15, margin: "0 0 8px" }}>{t("fashion.cost.prices")}</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <div><label style={lbl}>{t("fashion.cost.retail")}</label><input type="number" step="0.01" style={{ ...inp, width: "100%" }} disabled={!canManage} value={f.retailPrice} onChange={(e) => setF({ ...f, retailPrice: e.target.value })} /></div>
            <div><label style={lbl}>{t("fashion.cost.selling")}</label><input type="number" step="0.01" style={{ ...inp, width: "100%" }} disabled={!canManage} value={f.sellingPrice} onChange={(e) => setF({ ...f, sellingPrice: e.target.value })} /></div>
          </div>
          <h4 style={{ fontSize: 12.5, margin: "12px 0 6px", color: "var(--muted)" }}>{t("fashion.cost.allocations")}</h4>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {([["marketingAlloc", "allocMarketing"], ["paymentFees", "allocFees"], ["fulfillment", "allocFulfillment"], ["returnsAllowance", "allocReturns"], ["logistics", "allocLogistics"], ["otherAlloc", "allocOther"]] as const).map(([k, key]) => (
              <div key={k}><label style={lbl}>{t(`fashion.cost.${key}`)}</label><input type="number" step="0.01" style={{ ...inp, width: "100%" }} disabled={!canManage} value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} /></div>
            ))}
          </div>
          {canManage && <button className="btn btn-primary btn-sm" style={{ marginTop: 12 }} disabled={busy} onClick={save}>{t("fashion.cost.save")}</button>}
        </div>
      </div>
    </div>
  );
}
