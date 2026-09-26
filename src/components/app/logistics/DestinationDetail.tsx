"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useI18n, useT } from "@/components/i18n/I18nProvider";
import { DestinationFormModal } from "@/components/app/logistics/DestinationFormModal";

type Dest = {
  id: string; name: string; country: string | null; city: string | null; postalCode: string | null;
  address: string | null; code: string | null; note: string | null; active: boolean;
};
type Stats = {
  totalDeliveries: number; totalQuantity: number; deliveriesThisMonth: number; quantityThisMonth: number;
  quantityThisYear: number; avgQuantity: number; firstDeliveryAt: string | null; lastDeliveryAt: string | null;
  topTruck: string | null; distinctTrucks: number; topProduct: string | null;
  products: { name: string; quantity: number }[];
  byMonth: { month: string; deliveries: number; quantity: number }[];
  byYear: { year: string; deliveries: number; quantity: number }[];
};
type HistoryRow = {
  id: string; shipmentDate: string | null; invoiceNumber: string | null; dispatchNumber: string | null; product: string | null;
  quantity: number | null; unit: string | null; truck: string | null; trailer: string | null; recipient: string | null; status: string | null;
};
type Deliveries = { total: number; page: number; pageSize: number; rows: HistoryRow[] };

const PAGE_SIZE = 25;

export function DestinationDetail({ id, canManage }: { id: string; canManage: boolean }) {
  const t = useT();
  const { locale, num } = useI18n();
  const [dest, setDest] = useState<Dest | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [periodMode, setPeriodMode] = useState<"month" | "year">("month");

  // История (server-side pagination + филтри).
  const [deliveries, setDeliveries] = useState<Deliveries | null>(null);
  const [page, setPage] = useState(1);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [q, setQ] = useState("");
  const [product, setProduct] = useState("");
  const [sortAsc, setSortAsc] = useState(false);

  const loadSummary = useCallback(async () => {
    const r = await fetch(`/api/logistics/destinations/${id}`);
    if (r.ok) { const j = await r.json(); setDest(j.destination); setStats(j.stats); }
  }, [id]);

  const loadDeliveries = useCallback(async () => {
    const p = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE), sort: sortAsc ? "date_asc" : "date_desc" });
    if (from) p.set("from", from);
    if (to) p.set("to", to);
    if (q.trim()) p.set("q", q.trim());
    if (product.trim()) p.set("product", product.trim());
    const r = await fetch(`/api/logistics/destinations/${id}/deliveries?${p.toString()}`);
    if (r.ok) setDeliveries(await r.json());
  }, [id, page, from, to, q, product, sortAsc]);

  useEffect(() => { loadSummary(); }, [loadSummary]);
  useEffect(() => { loadDeliveries(); }, [loadDeliveries]);

  async function toggleActive() {
    if (!dest) return;
    setBusy(true);
    const r = await fetch(`/api/logistics/destinations/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ active: !dest.active }) });
    setBusy(false);
    if (r.ok) loadSummary();
  }

  if (!dest || !stats) return <div style={{ color: "var(--muted)", padding: 30 }}>…</div>;
  const fmtDate = (iso: string | null) => iso ? new Date(iso).toLocaleDateString(locale, { day: "2-digit", month: "2-digit", year: "numeric" }) : "—";
  const fmtMonth = (ym: string) => { const [y, m] = ym.split("-"); return `${m}.${y}`; };
  const pages = deliveries ? Math.max(1, Math.ceil(deliveries.total / deliveries.pageSize)) : 1;

  const th = { textAlign: "left" as const, padding: "8px 10px", color: "var(--muted)", fontSize: 12, whiteSpace: "nowrap" as const };
  const td = { padding: "8px 10px", fontSize: 12.5, borderTop: "1px solid rgba(217,215,200,.5)" };
  const inp = { padding: "6px 9px", fontSize: 12.5 } as const;

  const Kpi = ({ label, value }: { label: string; value: string }) => (
    <div className="glass panel" style={{ padding: "12px 14px" }}>
      <div style={{ fontSize: 10.5, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 3 }}>{label}</div>
      <div style={{ fontFamily: "'Fraunces', serif", fontSize: 20, fontWeight: 600 }}>{value}</div>
    </div>
  );
  const periods = periodMode === "month"
    ? stats.byMonth.map((r) => ({ label: fmtMonth(r.month), deliveries: r.deliveries, quantity: r.quantity }))
    : stats.byYear.map((r) => ({ label: r.year, deliveries: r.deliveries, quantity: r.quantity }));

  return (
    <div>
      <div style={{ marginBottom: 6 }}><Link href="/dashboard/logistics/destinations" style={{ color: "var(--muted)", fontSize: 13, textDecoration: "none" }}>← {t("logistics.destinations.title")}</Link></div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10, marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 12, color: "var(--muted)" }}>{t("logistics.destinations.detailEyebrow")}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "2px 0 4px" }}>
            <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 26, fontWeight: 600, margin: 0 }}>{dest.name}</h1>
            {dest.active
              ? <span style={{ fontSize: 11.5, color: "var(--emerald-dark)", fontWeight: 700 }}>{t("logistics.common.active")}</span>
              : <span style={{ fontSize: 11, fontWeight: 700, color: "#fff", background: "var(--muted)", borderRadius: 20, padding: "2px 10px" }}>{t("logistics.destinations.inactiveBadge")}</span>}
          </div>
          <div style={{ fontSize: 13, color: "var(--ink-soft)" }}>{dest.country ?? "—"}{dest.city ? ` · ${dest.city}` : ""}{dest.postalCode ? ` · ${dest.postalCode}` : ""}</div>
          {dest.address && <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 2 }}>{dest.address}</div>}
          {dest.code && <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 2 }}>{t("logistics.destinations.code")}: {dest.code}</div>}
        </div>
        {canManage && (
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-ghost btn-sm" onClick={() => setEditing(true)}>{t("logistics.common.edit")}</button>
            <button className="btn btn-ghost btn-sm" disabled={busy} onClick={toggleActive}>{dest.active ? t("logistics.destinations.deactivate") : t("logistics.common.activate")}</button>
          </div>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 10, marginBottom: 18 }}>
        <Kpi label={t("logistics.destinations.kpiTotal")} value={String(stats.totalDeliveries)} />
        <Kpi label={t("logistics.destinations.kpiTotalQty")} value={`${num(stats.totalQuantity)} t`} />
        <Kpi label={t("logistics.destinations.kpiFirst")} value={fmtDate(stats.firstDeliveryAt)} />
        <Kpi label={t("logistics.destinations.kpiLast")} value={fmtDate(stats.lastDeliveryAt)} />
        <Kpi label={t("logistics.destinations.kpiAvg")} value={`${num(stats.avgQuantity)} t`} />
      </div>

      {stats.products.length > 0 && (
        <div className="glass panel" style={{ marginBottom: 18 }}>
          <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 16, margin: "0 0 10px" }}>{t("logistics.destinations.productsTitle")}</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {stats.products.map((p) => (
              <div key={p.name} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, borderBottom: "1px solid rgba(217,215,200,.4)", paddingBottom: 4 }}>
                <span>{p.name}</span><strong>{num(p.quantity)} t</strong>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* История на доставките */}
      <div className="glass panel" style={{ overflowX: "auto", marginBottom: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
          <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 16, margin: 0 }}>{t("logistics.destinations.historyTitle")}</h3>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
            <input type="date" style={inp} value={from} onChange={(e) => { setPage(1); setFrom(e.target.value); }} title={t("logistics.destinations.filterFrom")} />
            <input type="date" style={inp} value={to} onChange={(e) => { setPage(1); setTo(e.target.value); }} title={t("logistics.destinations.filterTo")} />
            <input style={{ ...inp, width: 150 }} placeholder={t("logistics.destinations.searchHistory")} value={q} onChange={(e) => { setPage(1); setQ(e.target.value); }} />
            <input style={{ ...inp, width: 120 }} placeholder={t("logistics.destinations.hProduct")} value={product} onChange={(e) => { setPage(1); setProduct(e.target.value); }} />
          </div>
        </div>
        {!deliveries || deliveries.rows.length === 0 ? (
          <div style={{ fontSize: 13, color: "var(--muted)" }}>{t("logistics.destinations.historyEmpty")}</div>
        ) : (
          <>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr>
                <th style={{ ...th, cursor: "pointer" }} onClick={() => { setPage(1); setSortAsc((s) => !s); }}>{t("logistics.destinations.hDate")} {sortAsc ? "↑" : "↓"}</th>
                <th style={th}>{t("logistics.destinations.hInvoice")}</th>
                <th style={th}>{t("logistics.destinations.hDispatch")}</th>
                <th style={th}>{t("logistics.destinations.hTruck")}</th>
                <th style={th}>{t("logistics.destinations.hProduct")}</th>
                <th style={th}>{t("logistics.destinations.hQuantity")}</th>
                <th style={th}>{t("logistics.destinations.hRecipient")}</th>
                <th style={th}>{t("logistics.destinations.hStatus")}</th>
                <th style={th} />
              </tr></thead>
              <tbody>
                {deliveries.rows.map((r) => (
                  <tr key={r.id}>
                    <td style={td}>{fmtDate(r.shipmentDate)}</td>
                    <td style={td}>{r.invoiceNumber ?? "—"}</td>
                    <td style={td}>{r.dispatchNumber ?? "—"}</td>
                    <td style={td}>{[r.truck, r.trailer].filter(Boolean).join(" / ") || "—"}</td>
                    <td style={td}>{r.product ?? "—"}</td>
                    <td style={td}>{r.quantity != null ? `${num(r.quantity)} ${r.unit ?? "t"}` : "—"}</td>
                    <td style={td}>{r.recipient ?? "—"}</td>
                    <td style={td}>{r.status ? t(`logistics.destinations.st.${r.status}`) : "—"}</td>
                    <td style={td}><Link href={`/dashboard/logistics/export/${r.id}`} className="btn btn-ghost btn-sm">{t("logistics.destinations.open")}</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ display: "flex", gap: 8, justifyContent: "space-between", alignItems: "center", marginTop: 12, flexWrap: "wrap" }}>
              <span style={{ fontSize: 12, color: "var(--muted)" }}>{t("logistics.destinations.totalRows", { n: deliveries.total })}</span>
              {pages > 1 && (
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <button className="btn btn-ghost btn-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>←</button>
                  <span style={{ fontSize: 12.5, color: "var(--muted)" }}>{page} / {pages}</span>
                  <button className="btn btn-ghost btn-sm" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>→</button>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Статистика по период */}
      {periods.length > 0 && (
        <div className="glass panel" style={{ overflowX: "auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, gap: 8, flexWrap: "wrap" }}>
            <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 16, margin: 0 }}>{t("logistics.destinations.periodTitle")}</h3>
            <div style={{ display: "flex", gap: 6 }}>
              <button className={`btn btn-sm ${periodMode === "month" ? "btn-primary" : "btn-ghost"}`} onClick={() => setPeriodMode("month")}>{t("logistics.destinations.byMonth")}</button>
              <button className={`btn btn-sm ${periodMode === "year" ? "btn-primary" : "btn-ghost"}`} onClick={() => setPeriodMode("year")}>{t("logistics.destinations.byYear")}</button>
            </div>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr>
              <th style={th}>{t("logistics.destinations.colPeriod")}</th>
              <th style={th}>{t("logistics.destinations.colDeliveries")}</th>
              <th style={th}>{t("logistics.destinations.colQuantity")}</th>
            </tr></thead>
            <tbody>
              {periods.map((p) => (
                <tr key={p.label}><td style={td}>{p.label}</td><td style={td}>{p.deliveries}</td><td style={td}>{num(p.quantity)} t</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <DestinationFormModal
          mode="edit"
          initial={{ id: dest.id, name: dest.name, country: dest.country ?? "", city: dest.city ?? "", postalCode: dest.postalCode ?? "", address: dest.address ?? "", code: dest.code ?? "", note: dest.note ?? "", active: dest.active }}
          onClose={() => setEditing(false)}
          onSaved={() => { setEditing(false); loadSummary(); loadDeliveries(); }}
        />
      )}
    </div>
  );
}
