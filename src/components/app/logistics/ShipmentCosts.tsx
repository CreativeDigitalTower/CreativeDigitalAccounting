"use client";
import { useEffect, useState } from "react";
import { useT } from "@/components/i18n/I18nProvider";
import { IMPORT_COST_TYPES, costIncludedByDefault } from "@/lib/logistics/config";
import { confirmDelete } from "@/lib/confirmDelete";

type Cost = { id: string; costType: string; amount: number; currency: string; fxRate: number; baseAmount: number; vatRate: number | null; includeInCost: boolean; note: string | null };
type Summary = { purchase: number; costsIncluded: number; costsExcluded: number; totalCost: number };

export function ShipmentCosts({ shipmentId, canManage }: { shipmentId: string; canManage: boolean }) {
  const t = useT();
  const [costs, setCosts] = useState<Cost[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [baseCurrency, setBaseCurrency] = useState("EUR");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ costType: "transport", amount: "", currency: "EUR", fxRate: "1", vatRate: "" });

  async function load() {
    const r = await fetch(`/api/logistics/shipments/${shipmentId}/costs`);
    if (r.ok) { const j = await r.json(); setCosts(j.costs ?? []); setSummary(j.summary ?? null); setBaseCurrency(j.baseCurrency ?? "EUR"); }
  }
  useEffect(() => { load(); }, [shipmentId]);

  async function add() {
    setErr(""); setBusy(true);
    const r = await fetch(`/api/logistics/shipments/${shipmentId}/costs`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ costType: f.costType, amount: Number(f.amount), currency: f.currency, fxRate: f.fxRate ? Number(f.fxRate) : 1, vatRate: f.vatRate ? Number(f.vatRate) : null }),
    });
    const j = await r.json().catch(() => ({})); setBusy(false);
    if (!r.ok) { setErr(j.error ?? t("logistics.common.err")); return; }
    setF({ costType: "transport", amount: "", currency: "EUR", fxRate: "1", vatRate: "" }); setOpen(false); load();
  }
  async function del(id: string) {
    if (!(await confirmDelete())) return;
    const r = await fetch(`/api/logistics/shipments/${shipmentId}/costs/${id}`, { method: "DELETE" });
    if (r.ok) load();
  }
  // При избор на вид → предложи дали влиза в себестойност (ДДВ по подразбиране не).
  function pickType(costType: string) {
    setF((s) => ({ ...s, costType, vatRate: costType === "mk_vat" ? "18" : s.vatRate }));
  }

  const inp = { padding: "5px 6px", fontSize: 12 } as const;
  const td = { padding: "5px 6px", fontSize: 12, borderTop: "1px solid rgba(217,215,200,.4)" };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <span style={{ fontSize: 12.5, fontWeight: 600 }}>{t("logistics.costs.title")}</span>
        {canManage && <button className="btn btn-ghost btn-sm" onClick={() => setOpen(!open)} style={{ marginLeft: "auto" }}>{t("logistics.costs.add")}</button>}
      </div>
      {err && <div style={{ color: "var(--brick)", fontSize: 12, marginBottom: 6 }}>{err}</div>}

      {open && canManage && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "end", border: "1px solid rgba(217,215,200,.6)", borderRadius: 8, padding: 8, marginBottom: 8 }}>
          <select style={inp} value={f.costType} onChange={(e) => pickType(e.target.value)}>
            {IMPORT_COST_TYPES.map((c) => <option key={c} value={c}>{t(`logistics.costTypes.${c}`)}</option>)}
          </select>
          <input type="number" step="0.01" style={{ ...inp, width: 84 }} placeholder={t("logistics.costs.amount")} value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} />
          <input style={{ ...inp, width: 56 }} placeholder={t("logistics.costs.currency")} value={f.currency} onChange={(e) => setF({ ...f, currency: e.target.value })} />
          <input type="number" step="0.0001" style={{ ...inp, width: 70 }} placeholder={t("logistics.costs.fxRate")} value={f.fxRate} onChange={(e) => setF({ ...f, fxRate: e.target.value })} title={t("logistics.costs.fxRate")} />
          {f.costType === "mk_vat" && <span style={{ fontSize: 10.5, color: "var(--muted)", maxWidth: 160 }}>{t("logistics.costs.mkVatHint")}</span>}
          <button className="btn btn-primary btn-sm" disabled={busy || !(Number(f.amount) >= 0) || f.amount === ""} onClick={add}>{t("logistics.common.add")}</button>
        </div>
      )}

      {costs.length === 0 ? <div style={{ fontSize: 12, color: "var(--muted)" }}>{t("logistics.costs.empty")}</div> : (
        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 8 }}>
          <tbody>
            {costs.map((c) => (
              <tr key={c.id}>
                <td style={td}>{t(`logistics.costTypes.${c.costType}`)}{!c.includeInCost && <span style={{ fontSize: 10, color: "var(--muted)" }}> ·excl</span>}</td>
                <td style={{ ...td, textAlign: "right" }} className="num">{c.amount} {c.currency}</td>
                <td style={{ ...td, textAlign: "right", color: "var(--muted)" }} className="num">{c.currency !== baseCurrency ? `= ${c.baseAmount} ${baseCurrency}` : ""}</td>
                <td style={{ ...td, textAlign: "right" }}>{canManage && <button className="btn btn-ghost btn-sm" style={{ color: "var(--brick)", padding: "1px 6px" }} onClick={() => del(c.id)}>✕</button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {summary && (
        <div style={{ fontSize: 12.5, borderTop: "1px solid rgba(217,215,200,.6)", paddingTop: 6 }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "var(--muted)" }}>{t("logistics.costs.purchase")}</span><span className="num">{summary.purchase} {baseCurrency}</span></div>
          <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "var(--muted)" }}>{t("logistics.costs.included")}</span><span className="num">{summary.costsIncluded} {baseCurrency}</span></div>
          <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, marginTop: 2 }}><span>{t("logistics.costs.totalCost")}</span><span className="num">{summary.totalCost} {baseCurrency}</span></div>
        </div>
      )}
    </div>
  );
}
