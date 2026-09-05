"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useT, useI18n } from "@/components/i18n/I18nProvider";
import { confirmDelete } from "@/lib/confirmDelete";
import { parseQuantity } from "@/lib/i18n/format";
import { ClientFormModal, type ClientForm } from "@/components/app/logistics/ClientFormModal";

type ByProduct = { product: string; quantity: number; revenue: number };
type Summary = { invoicesCount: number; revenue: number; quantity: number; lastPurchase: string | null; avgPricePerUnit: number | null; byProduct: ByProduct[] };
type Invoice = { id: string; number: string; date: string | null; currency: string; gross: number };
type Hist = { id: string; year: number; revenue: number | null; quantity: number | null; unit: string; note: string | null };
type HistP = { id: string; year: number; product: string; quantity: number | null; revenue: number | null };
type DeliveryStats = { trips: number; quantity: number; firstTrip: string | null; lastTrip: string | null; thisMonthTrips: number; thisMonthQuantity: number; distinctVehicles: number; distinctProducts: number; monthly: { month: string; trips: number; quantity: number }[] };
type DeliveryRow = { id: string; invoiceNumber: string; date: string | null; truck: string | null; trailer: string | null; product: string | null; quantity: number | null; unit: string; destination: string | null; vehicleId: string | null; attachmentCount: number };
type Data = { id: string; name: string; eik: string | null; vatNumber: string | null; city: string | null; address: string | null; country: string | null; phone: string | null; contactEmail: string | null; contactPerson: string | null; deliveryStats: DeliveryStats; deliveries: DeliveryRow[]; summary: Summary; invoices: Invoice[]; historical: Hist[]; historicalProducts: HistP[] };

export function ClientDossier({ id, canManage, canEdit = false }: { id: string; canManage: boolean; canEdit?: boolean }) {
  const t = useT();
  const { qty, qtyUnit } = useI18n();
  const [d, setD] = useState<Data | null>(null);
  const [editing, setEditing] = useState<ClientForm | null>(null);
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
        {canEdit && <button className="btn btn-ghost btn-sm" style={{ marginLeft: "auto" }} onClick={() => setEditing({ id: d.id, name: d.name, eik: d.eik ?? "", vatNumber: d.vatNumber ?? "", address: d.address ?? "", city: d.city ?? "", country: d.country ?? "", phone: d.phone ?? "", contactEmail: d.contactEmail ?? "", contactPerson: d.contactPerson ?? "" })}>{t("logistics.clients.editClient")}</button>}
      </div>

      {/* Статистика по доставки (§23-§24) — derived от Export Deliveries */}
      <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 15, margin: "0 0 8px" }}>{t("logistics.clients.statsTitle")}</h3>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: 10, marginBottom: 10 }}>
        {kpi(t("logistics.clients.totalDeliveries"), d.deliveryStats.trips)}
        {kpi(t("logistics.clients.totalQuantity"), qtyUnit(d.deliveryStats.quantity, "t"))}
        {kpi(t("logistics.clients.lastDelivery"), d.deliveryStats.lastTrip ? new Date(d.deliveryStats.lastTrip).toLocaleDateString() : "—")}
        {kpi(t("logistics.clients.firstDelivery"), d.deliveryStats.firstTrip ? new Date(d.deliveryStats.firstTrip).toLocaleDateString() : "—")}
        {kpi(t("logistics.clients.distinctVehicles"), d.deliveryStats.distinctVehicles)}
        {kpi(t("logistics.clients.distinctProducts"), d.deliveryStats.distinctProducts)}
      </div>
      {d.deliveryStats.monthly.some((m) => m.trips > 0) && (
        <div className="glass panel" style={{ marginBottom: 14, maxWidth: 420 }}>
          <div style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 4 }}>{t("logistics.clients.monthlyTitle")}</div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead><tr><th style={th}>{t("logistics.clients.month")}</th><th style={{ ...th, textAlign: "right" }}>{t("logistics.clients.deliveries")}</th><th style={{ ...th, textAlign: "right" }}>{t("logistics.clients.quantity")}</th></tr></thead>
            <tbody>{d.deliveryStats.monthly.filter((m) => m.trips > 0).map((m) => <tr key={m.month}><td style={td} className="num">{m.month}</td><td style={{ ...td, textAlign: "right" }} className="num">{m.trips}</td><td style={{ ...td, textAlign: "right" }} className="num">{qtyUnit(m.quantity, "t")}</td></tr>)}</tbody>
          </table>
        </div>
      )}
      {d.deliveries.length > 0 && (
        <div className="glass panel" style={{ marginBottom: 14, overflowX: "auto" }}>
          <div style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 4 }}>{t("logistics.clients.historyTitle")}</div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead><tr>
              <th style={th}>{t("logistics.clients.date")}</th><th style={th}>{t("logistics.clients.number")}</th>
              <th style={th}>{t("logistics.clients.truck")}</th><th style={th}>{t("logistics.clients.trailer")}</th>
              <th style={th}>{t("logistics.clients.product")}</th><th style={{ ...th, textAlign: "right" }}>{t("logistics.clients.quantity")}</th>
              <th style={th}>{t("logistics.clients.destination")}</th><th style={th} />
            </tr></thead>
            <tbody>
              {d.deliveries.map((x) => (
                <tr key={x.id}>
                  <td style={td}>{dt(x.date)}</td><td style={td}>{x.invoiceNumber}</td>
                  <td style={td} className="num">{x.vehicleId ? <Link href={`/dashboard/logistics/vehicles/${x.vehicleId}`}>{x.truck ?? "—"}</Link> : (x.truck ?? "—")}</td>
                  <td style={td} className="num">{x.trailer ?? "—"}</td>
                  <td style={td}>{x.product ?? "—"}</td>
                  <td style={{ ...td, textAlign: "right" }} className="num">{x.quantity != null ? `${x.quantity} ${x.unit}` : "—"}</td>
                  <td style={td}>{x.destination ?? "—"}</td>
                  <td style={{ ...td, whiteSpace: "nowrap" }}><Link href={`/dashboard/logistics/export/${x.id}`} className="btn btn-ghost btn-sm" style={{ fontSize: 11, padding: "2px 8px" }}>{t("logistics.clients.dossier")}{x.attachmentCount > 0 ? ` · +${x.attachmentCount}` : ""}</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {editing && <ClientFormModal initial={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); void load(); }} />}

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
