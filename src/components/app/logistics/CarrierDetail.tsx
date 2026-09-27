"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useI18n, useT } from "@/components/i18n/I18nProvider";

type Carrier = { id: string; name: string; eik: string | null; contact: string | null; phone: string | null; email: string | null; note: string | null; active: boolean };
type VehicleView = { id: string; registration: string; active: boolean; trailer: string | null; driver: string | null; capacity: number | null; trips: number; quantity: number; lastDelivery: string | null };
type Stats = {
  totalTrips: number; totalQuantity: number; avgQuantity: number; tripsThisMonth: number; quantityThisMonth: number;
  firstDeliveryAt: string | null; lastDeliveryAt: string | null; maxTripQuantity: number; distinctVehicles: number; distinctDestinations: number;
  byVehicle: { vehicleId: string; truckReg: string | null; trips: number; quantity: number; avg: number; lastDelivery: string | null }[];
  byDestination: { destination: string; trips: number; quantity: number }[];
  byMonth: { month: string; trips: number; quantity: number }[];
};
type Detail = { carrier: Carrier; vehiclesActive: number; vehiclesTotal: number; stats: Stats; vehicles: VehicleView[] };
type HistoryRow = { id: string; shipmentDate: string | null; invoiceNumber: string | null; dispatchNumber: string | null; truck: string | null; trailer: string | null; destination: string | null; product: string | null; quantity: number | null; unit: string | null; status: string | null };

const PERIODS = ["current_month", "prev_month", "last_3m", "last_6m", "current_year", "all"] as const;
const PAGE = 25;

export function CarrierDetail({ id, canManage }: { id: string; canManage: boolean }) {
  const t = useT();
  const { locale, num } = useI18n();
  const [d, setD] = useState<Detail | null>(null);
  const [range, setRange] = useState<string>("all");
  const [busy, setBusy] = useState(false);
  const [hist, setHist] = useState<{ total: number; rows: HistoryRow[] } | null>(null);
  const [page, setPage] = useState(1);

  const loadDetail = useCallback(async () => {
    const r = await fetch(`/api/logistics/carriers/${id}?range=${range}`);
    if (r.ok) setD(await r.json());
  }, [id, range]);
  const loadHist = useCallback(async () => {
    const r = await fetch(`/api/logistics/carriers/${id}/deliveries?range=${range}&page=${page}&pageSize=${PAGE}`);
    if (r.ok) setHist(await r.json());
  }, [id, range, page]);
  useEffect(() => { loadDetail(); }, [loadDetail]);
  useEffect(() => { loadHist(); }, [loadHist]);
  useEffect(() => { setPage(1); }, [range]);

  async function toggleActive() {
    if (!d) return;
    setBusy(true);
    const r = await fetch(`/api/logistics/carriers/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ active: !d.carrier.active }) });
    setBusy(false); if (r.ok) loadDetail();
  }

  if (!d) return <div style={{ color: "var(--muted)", padding: 30 }}>…</div>;
  const c = d.carrier, s = d.stats;
  const fmtDate = (iso: string | null) => iso ? new Date(iso).toLocaleDateString(locale, { day: "2-digit", month: "2-digit", year: "numeric" }) : "—";
  const fmtMonth = (ym: string) => { const [y, m] = ym.split("-"); return `${m}.${y}`; };
  const pages = hist ? Math.max(1, Math.ceil(hist.total / PAGE)) : 1;
  const totalQ = s.totalQuantity || 1;
  const th = { textAlign: "left" as const, padding: "7px 9px", color: "var(--muted)", fontSize: 12, whiteSpace: "nowrap" as const };
  const td = { padding: "7px 9px", fontSize: 12.5, borderTop: "1px solid rgba(217,215,200,.4)" };
  const sel = { padding: "6px 9px", fontSize: 12.5 } as const;
  const Kpi = ({ label, value }: { label: string; value: string }) => (
    <div className="glass panel" style={{ padding: "11px 14px", minWidth: 120 }}>
      <div style={{ fontSize: 10.5, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 3 }}>{label}</div>
      <div style={{ fontFamily: "'Fraunces', serif", fontSize: 19, fontWeight: 600 }}>{value}</div>
    </div>
  );

  return (
    <div>
      <div style={{ marginBottom: 6 }}><Link href="/dashboard/logistics/carriers" style={{ color: "var(--muted)", fontSize: 13, textDecoration: "none" }}>← {t("logistics.carriers.title")}</Link></div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10, marginBottom: 16 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 25, fontWeight: 600, margin: 0 }}>{c.name}</h1>
            {c.active ? <span style={{ fontSize: 11.5, color: "var(--emerald-dark)", fontWeight: 700 }}>{t("logistics.common.active")}</span>
              : <span style={{ fontSize: 11, fontWeight: 700, color: "#fff", background: "var(--muted)", borderRadius: 20, padding: "2px 10px" }}>{t("logistics.fleet.archived")}</span>}
          </div>
          <div style={{ fontSize: 13, color: "var(--ink-soft)", marginTop: 3 }}>
            {c.eik ? `${t("logistics.carriers.eik")}: ${c.eik}` : ""}{c.contact ? `  ·  ${c.contact}` : ""}{c.phone ? `  ·  ${c.phone}` : ""}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <select style={sel} value={range} onChange={(e) => setRange(e.target.value)}>
            {PERIODS.map((p) => <option key={p} value={p}>{t(`logistics.period.${p}`)}</option>)}
          </select>
          {canManage && <button className="btn btn-ghost btn-sm" disabled={busy} onClick={toggleActive}>{c.active ? t("logistics.fleet.archive") : t("logistics.common.activate")}</button>}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 10, marginBottom: 18 }}>
        <Kpi label={t("logistics.carriers.kpiVehiclesTotal")} value={`${d.vehiclesActive} / ${d.vehiclesTotal}`} />
        <Kpi label={t("logistics.carriers.colTrips")} value={String(s.totalTrips)} />
        <Kpi label={t("logistics.carriers.colQuantity")} value={`${num(s.totalQuantity)} t`} />
        <Kpi label={t("logistics.carriers.kpiAvg")} value={`${num(s.avgQuantity)} t`} />
        <Kpi label={t("logistics.carriers.kpiMonthTrips")} value={String(s.tripsThisMonth)} />
        <Kpi label={t("logistics.carriers.kpiFirst")} value={fmtDate(s.firstDeliveryAt)} />
        <Kpi label={t("logistics.carriers.kpiLast")} value={fmtDate(s.lastDeliveryAt)} />
        <Kpi label={t("logistics.carriers.kpiDestinations")} value={String(s.distinctDestinations)} />
      </div>

      {/* Автомобили */}
      <div className="glass panel" style={{ overflowX: "auto", marginBottom: 18 }}>
        <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 16, margin: "0 0 10px" }}>{t("logistics.carriers.vehiclesTitle")}</h3>
        {d.vehicles.length === 0 ? <div style={{ fontSize: 13, color: "var(--muted)" }}>{t("logistics.carriers.noVehicles")}</div> : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr>
              <th style={th}>{t("logistics.export.truck")}</th><th style={th}>{t("logistics.carriers.trailer")}</th><th style={th}>{t("logistics.carriers.driver")}</th>
              <th style={th}>{t("logistics.carriers.capacity")}</th><th style={th}>{t("logistics.common.status")}</th>
              <th style={th}>{t("logistics.carriers.colTrips")}</th><th style={th}>{t("logistics.carriers.colQuantity")}</th><th style={th}>{t("logistics.carriers.colLast")}</th>
            </tr></thead>
            <tbody>
              {d.vehicles.map((v) => (
                <tr key={v.id} style={{ opacity: v.active ? 1 : 0.6 }}>
                  <td style={td}><Link href={`/dashboard/logistics/vehicles/${v.id}`} style={{ color: "var(--navy)", fontWeight: 600, textDecoration: "none" }}>{v.registration}</Link></td>
                  <td style={td}>{v.trailer ?? "—"}</td><td style={td}>{v.driver ?? "—"}</td>
                  <td style={td}>{v.capacity != null ? `${num(v.capacity)} t` : "—"}</td>
                  <td style={td}>{v.active ? t("logistics.common.active") : t("logistics.fleet.archived")}</td>
                  <td style={td}>{v.trips}</td><td style={td}>{num(v.quantity)} t</td><td style={td}>{fmtDate(v.lastDelivery)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* По дестинации + По месеци */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16, marginBottom: 18 }}>
        {s.byDestination.length > 0 && (
          <div className="glass panel" style={{ overflowX: "auto" }}>
            <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 16, margin: "0 0 10px" }}>{t("logistics.carriers.byDestination")}</h3>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr><th style={th}>{t("logistics.export.destination")}</th><th style={th}>{t("logistics.carriers.colTrips")}</th><th style={th}>{t("logistics.carriers.colQuantity")}</th><th style={th}>%</th></tr></thead>
              <tbody>{s.byDestination.map((r) => (
                <tr key={r.destination}><td style={td}>{r.destination}</td><td style={td}>{r.trips}</td><td style={td}>{num(r.quantity)} t</td><td style={td}>{Math.round((r.quantity / totalQ) * 100)}%</td></tr>
              ))}</tbody>
            </table>
          </div>
        )}
        {s.byMonth.length > 0 && (
          <div className="glass panel" style={{ overflowX: "auto" }}>
            <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 16, margin: "0 0 10px" }}>{t("logistics.carriers.byMonth")}</h3>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr><th style={th}>{t("logistics.destinations.colPeriod")}</th><th style={th}>{t("logistics.carriers.colTrips")}</th><th style={th}>{t("logistics.carriers.colQuantity")}</th></tr></thead>
              <tbody>{s.byMonth.map((r) => (
                <tr key={r.month}><td style={td}>{fmtMonth(r.month)}</td><td style={td}>{r.trips}</td><td style={td}>{num(r.quantity)} t</td></tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </div>

      {/* История на превозите */}
      <div className="glass panel" style={{ overflowX: "auto" }}>
        <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 16, margin: "0 0 4px" }}>{t("logistics.carriers.historyTitle")}</h3>
        <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 10 }}>{t("logistics.carriers.noDriverNote")}</div>
        {!hist || hist.rows.length === 0 ? <div style={{ fontSize: 13, color: "var(--muted)" }}>{t("logistics.carriers.historyEmpty")}</div> : (
          <>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr>
                <th style={th}>{t("logistics.destinations.hDate")}</th><th style={th}>{t("logistics.destinations.hInvoice")}</th><th style={th}>{t("logistics.destinations.hDispatch")}</th>
                <th style={th}>{t("logistics.carriers.truckTrailer")}</th><th style={th}>{t("logistics.export.destination")}</th><th style={th}>{t("logistics.destinations.hProduct")}</th>
                <th style={th}>{t("logistics.destinations.hQuantity")}</th><th style={th}>{t("logistics.destinations.hStatus")}</th><th style={th} />
              </tr></thead>
              <tbody>
                {hist.rows.map((r) => (
                  <tr key={r.id}>
                    <td style={td}>{fmtDate(r.shipmentDate)}</td><td style={td}>{r.invoiceNumber ?? "—"}</td><td style={td}>{r.dispatchNumber ?? "—"}</td>
                    <td style={td}>{[r.truck, r.trailer].filter(Boolean).join(" / ") || "—"}</td><td style={td}>{r.destination ?? "—"}</td><td style={td}>{r.product ?? "—"}</td>
                    <td style={td}>{r.quantity != null ? `${num(r.quantity)} ${r.unit ?? "t"}` : "—"}</td>
                    <td style={td}>{r.status ? t(`logistics.destinations.st.${r.status}`) : "—"}</td>
                    <td style={td}><Link href={`/dashboard/logistics/export/${r.id}`} className="btn btn-ghost btn-sm">{t("logistics.destinations.open")}</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12, flexWrap: "wrap", gap: 8 }}>
              <span style={{ fontSize: 12, color: "var(--muted)" }}>{t("logistics.destinations.totalRows", { n: hist.total })}</span>
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
    </div>
  );
}
