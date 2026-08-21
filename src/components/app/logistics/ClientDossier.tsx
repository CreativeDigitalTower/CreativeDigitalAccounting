"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useT, useI18n } from "@/components/i18n/I18nProvider";
import { confirmDelete } from "@/lib/confirmDelete";
import { parseQuantity } from "@/lib/i18n/format";

type ByProduct = { product: string; quantity: number; revenue: number };
type Summary = { invoicesCount: number; revenue: number; quantity: number; lastPurchase: string | null; avgPricePerUnit: number | null; byProduct: ByProduct[] };
type Invoice = { id: string; number: string; date: string | null; currency: string; gross: number };
type Hist = { id: string; year: number; revenue: number | null; quantity: number | null; unit: string; note: string | null };
type HistP = { id: string; year: number; product: string; quantity: number | null; revenue: number | null };
type Data = { id: string; name: string; eik: string | null; summary: Summary; invoices: Invoice[]; historical: Hist[]; historicalProducts: HistP[] };

export function ClientDossier({ id, canManage }: { id: string; canManage: boolean }) {
  const t = useT();
  const { qty, qtyUnit } = useI18n();
  const [d, setD] = useState<Data | null>(null);
  const [hy, setHy] = useState({ year: "", revenue: "", quantity: "", unit: "t", note: "" });
  const [hp, setHp] = useState({ year: "", product: "", quantity: "", revenue: "" });
  const [histErr, setHistErr] = useState("");

  async function load() { const r = await fetch(`/api/logistics/clients/${id}`); if (r.ok) setD(await r.json()); }
  useEffect(() => { load(); }, [id]);
  if (!d) return null;

  async function addYear() {
    setHistErr("");
    if (!hy.year) { setHistErr(t("logistics.validation.date")); return; }
    const r = await fetch(`/api/logistics/clients/${id}/historical`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind: "year", year: Number(hy.year), revenue: hy.revenue ? Number(hy.revenue) : null, quantity: parseQuantity(hy.quantity), unit: hy.unit, note: hy.note || null }) });
    if (r.ok) { setHy({ year: "", revenue: "", quantity: "", unit: "t", note: "" }); load(); }
    else { const j = await r.json().catch(() => ({})); setHistErr(j.error ?? t("logistics.common.err")); }
  }
  async function addProduct() {
    setHistErr("");
    if (!hp.year) { setHistErr(t("logistics.validation.date")); return; }
    if (!hp.product) { setHistErr(t("logistics.validation.product")); return; }
    const r = await fetch(`/api/logistics/clients/${id}/historical`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind: "product", year: Number(hp.year), product: hp.product, quantity: parseQuantity(hp.quantity), revenue: hp.revenue ? Number(hp.revenue) : null }) });
    if (r.ok) { setHp({ year: "", product: "", quantity: "", revenue: "" }); load(); }
    else { const j = await r.json().catch(() => ({})); setHistErr(j.error ?? t("logistics.common.err")); }
  }
  async function del(kind: "year" | "product", rowId: string) {
    if (!(await confirmDelete())) return;
    const r = await fetch(`/api/logistics/clients/${id}/historical?kind=${kind}&rowId=${rowId}`, { method: "DELETE" });
    if (r.ok) load();
  }

  const s = d.summary;
  const dt = (x: string | null) => x ? new Date(x).toLocaleDateString() : "—";
  const inp = { padding: "5px 7px", fontSize: 12.5 } as const;
  const td = { padding: "5px 8px", fontSize: 12.5, borderTop: "1px solid rgba(217,215,200,.5)" };
  const th = { textAlign: "left" as const, padding: "5px 8px", color: "var(--muted)", fontSize: 11.5 };
  const kpi = (label: string, val: React.ReactNode) => (<div className="glass kpi-card"><div style={{ fontSize: 11.5, color: "var(--muted)" }}>{label}</div><div className="num" style={{ fontSize: 17, fontWeight: 600 }}>{val}</div></div>);

  return (
    <div style={{ maxWidth: 960 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14, flexWrap: "wrap" }}>
        <Link href="/dashboard/logistics/clients" style={{ color: "var(--muted)", textDecoration: "none", fontSize: 13 }}>← {t("logistics.clients.title")}</Link>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 600, margin: 0 }}>{d.name}</h1>
      </div>

      <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 15, margin: "0 0 8px" }}>{t("logistics.clients.salesTitle")}</h3>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: 10, marginBottom: 8 }}>
        {kpi(t("logistics.clients.invoices"), s.invoicesCount)}
        {kpi(t("logistics.clients.quantity"), qty(s.quantity))}
        {kpi(t("logistics.clients.revenue"), s.revenue)}
        {kpi(t("logistics.clients.avgPrice"), s.avgPricePerUnit ?? "—")}
        {kpi(t("logistics.clients.lastPurchase"), dt(s.lastPurchase))}
      </div>
      {s.byProduct.length > 0 && (
        <div className="glass panel" style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 4 }}>{t("logistics.clients.byProduct")}</div>
          {s.byProduct.map((p) => <div key={p.product} style={{ fontSize: 12.5, display: "flex", justifyContent: "space-between", padding: "3px 0" }}><span>{p.product}</span><span className="num">{qty(p.quantity)} · {p.revenue}</span></div>)}
        </div>
      )}

      {/* Фактури */}
      <div className="glass panel" style={{ marginBottom: 14, overflowX: "auto" }}>
        <div style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 4 }}>{t("logistics.clients.invoicesTitle")}</div>
        {d.invoices.length === 0 ? <div style={{ fontSize: 12.5, color: "var(--muted)" }}>{t("logistics.clients.noSales")}</div> : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <tbody>
              {d.invoices.map((inv) => (
                <tr key={inv.id}><td style={td}><Link href={`/dashboard/logistics/mk-sales/${inv.id}`}>{inv.number}</Link></td><td style={td}>{dt(inv.date)}</td><td style={{ ...td, textAlign: "right" }} className="num">{inv.gross} {inv.currency}</td></tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Исторически данни */}
      <div className="glass panel">
        <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 15, margin: "0 0 4px" }}>{t("logistics.clients.historicalTitle")}</h3>
        {histErr && <div role="alert" style={{ color: "var(--brick)", fontSize: 11.5, margin: "2px 0 6px" }}>{histErr}</div>}
        <p style={{ fontSize: 11, color: "var(--muted)", marginTop: 0 }}>{t("logistics.clients.aggregatedNote")}</p>
        {canManage && (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "end", marginBottom: 8 }}>
            <input style={{ ...inp, width: 64 }} placeholder={t("logistics.clients.year")} value={hy.year} onChange={(e) => setHy({ ...hy, year: e.target.value })} />
            <input style={{ ...inp, width: 90 }} placeholder={t("logistics.clients.revenue")} value={hy.revenue} onChange={(e) => setHy({ ...hy, revenue: e.target.value })} />
            <input style={{ ...inp, width: 90 }} placeholder={t("logistics.clients.quantity")} value={hy.quantity} onChange={(e) => setHy({ ...hy, quantity: e.target.value })} />
            <input style={{ ...inp, width: 44 }} value={hy.unit} onChange={(e) => setHy({ ...hy, unit: e.target.value })} />
            <button className="btn btn-primary btn-sm" onClick={addYear}>{t("logistics.clients.addYear")}</button>
          </div>
        )}
        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 10 }}>
          <thead><tr><th style={th}>{t("logistics.clients.year")}</th><th style={th}>{t("logistics.clients.revenue")}</th><th style={th}>{t("logistics.clients.quantity")}</th><th style={th}>{t("logistics.clients.note")}</th><th style={th}></th></tr></thead>
          <tbody>
            {d.historical.map((h) => (
              <tr key={h.id}><td style={td}>{h.year}</td><td style={td} className="num">{h.revenue ?? "—"}</td><td style={td} className="num">{h.quantity != null ? qtyUnit(h.quantity, h.unit) : "—"}</td><td style={td}>{h.note ?? ""}</td>
                <td style={{ ...td, textAlign: "right" }}>{canManage && <button className="btn btn-ghost btn-sm" style={{ color: "var(--brick)", padding: "1px 6px" }} onClick={() => del("year", h.id)}>✕</button>}</td></tr>
            ))}
          </tbody>
        </table>

        {canManage && (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "end", marginBottom: 8 }}>
            <input style={{ ...inp, width: 64 }} placeholder={t("logistics.clients.year")} value={hp.year} onChange={(e) => setHp({ ...hp, year: e.target.value })} />
            <input style={{ ...inp, width: 150 }} placeholder={t("logistics.clients.product")} value={hp.product} onChange={(e) => setHp({ ...hp, product: e.target.value })} />
            <input style={{ ...inp, width: 90 }} placeholder={t("logistics.clients.quantity")} value={hp.quantity} onChange={(e) => setHp({ ...hp, quantity: e.target.value })} />
            <input style={{ ...inp, width: 90 }} placeholder={t("logistics.clients.revenue")} value={hp.revenue} onChange={(e) => setHp({ ...hp, revenue: e.target.value })} />
            <button className="btn btn-primary btn-sm" onClick={addProduct}>{t("logistics.clients.addProduct")}</button>
          </div>
        )}
        {d.historicalProducts.length > 0 && (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr><th style={th}>{t("logistics.clients.year")}</th><th style={th}>{t("logistics.clients.product")}</th><th style={th}>{t("logistics.clients.quantity")}</th><th style={th}>{t("logistics.clients.revenue")}</th><th style={th}></th></tr></thead>
            <tbody>
              {d.historicalProducts.map((h) => (
                <tr key={h.id}><td style={td}>{h.year}</td><td style={td}>{h.product}</td><td style={td} className="num">{h.quantity != null ? qty(h.quantity) : "—"}</td><td style={td} className="num">{h.revenue ?? "—"}</td>
                  <td style={{ ...td, textAlign: "right" }}>{canManage && <button className="btn btn-ghost btn-sm" style={{ color: "var(--brick)", padding: "1px 6px" }} onClick={() => del("product", h.id)}>✕</button>}</td></tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
