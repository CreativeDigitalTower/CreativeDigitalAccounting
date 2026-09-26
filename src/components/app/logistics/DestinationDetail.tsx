"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useI18n, useT } from "@/components/i18n/I18nProvider";
import { DestinationFormModal } from "@/components/app/logistics/DestinationFormModal";

type Dest = {
  id: string; name: string; country: string | null; city: string | null; postalCode: string | null;
  address: string | null; code: string | null; note: string | null; active: boolean;
};
type Stats = {
  totalDeliveries: number; totalQuantity: number; deliveriesThisMonth: number; quantityThisMonth: number;
  quantityThisYear: number; avgQuantity: number; lastDeliveryAt: string | null;
  topTruck: string | null; distinctTrucks: number; topProduct: string | null;
  products: { name: string; quantity: number }[];
  byMonth: { month: string; deliveries: number; quantity: number }[];
};
type HistoryRow = {
  id: string; shipmentDate: string | null; invoiceNumber: string | null; product: string | null;
  quantity: number | null; unit: string | null; truck: string | null; trailer: string | null; recipient: string | null; status: string | null;
};
type Payload = { destination: Dest; stats: Stats; history: HistoryRow[] };

const PAGE = 20;

export function DestinationDetail({ id, canManage }: { id: string; canManage: boolean }) {
  const t = useT();
  const { locale, num } = useI18n();
  const [data, setData] = useState<Payload | null>(null);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [page, setPage] = useState(1);

  async function load() { const r = await fetch(`/api/logistics/destinations/${id}`); if (r.ok) setData(await r.json()); }
  useEffect(() => { load(); }, [id]);

  async function toggleActive() {
    if (!data) return;
    setBusy(true);
    const r = await fetch(`/api/logistics/destinations/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ active: !data.destination.active }) });
    setBusy(false);
    if (r.ok) load();
  }

  if (!data) return <div style={{ color: "var(--muted)", padding: 30 }}>…</div>;
  const { destination: d, stats, history } = data;
  const fmtDate = (iso: string | null) => iso ? new Date(iso).toLocaleDateString(locale, { day: "2-digit", month: "2-digit", year: "numeric" }) : "—";
  const pages = Math.max(1, Math.ceil(history.length / PAGE));
  const rows = history.slice((page - 1) * PAGE, page * PAGE);

  const th = { textAlign: "left" as const, padding: "8px 10px", color: "var(--muted)", fontSize: 12, whiteSpace: "nowrap" as const };
  const td = { padding: "8px 10px", fontSize: 12.5, borderTop: "1px solid rgba(217,215,200,.5)" };

  const Kpi = ({ label, value }: { label: string; value: string }) => (
    <div className="glass panel" style={{ padding: "14px 16px" }}>
      <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>{label}</div>
      <div style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 600 }}>{value}</div>
    </div>
  );

  return (
    <div>
      <div style={{ marginBottom: 6 }}><Link href="/dashboard/logistics/destinations" style={{ color: "var(--muted)", fontSize: 13, textDecoration: "none" }}>← {t("logistics.destinations.title")}</Link></div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10, marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 12, color: "var(--muted)" }}>{t("logistics.destinations.detailEyebrow")}</div>
          <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 26, fontWeight: 600, margin: "2px 0 4px" }}>{d.name}</h1>
          <div style={{ fontSize: 13, color: "var(--ink-soft)" }}>{d.country ?? "—"}{d.city ? ` · ${d.city}` : ""}</div>
          <div style={{ marginTop: 6 }}>{d.active
            ? <span style={{ fontSize: 12, color: "var(--emerald-dark)", fontWeight: 700 }}>{t("logistics.destinations.statusActive")}</span>
            : <span style={{ fontSize: 11, fontWeight: 700, color: "#fff", background: "var(--muted)", borderRadius: 20, padding: "2px 10px" }}>{t("logistics.destinations.inactiveBadge")}</span>}</div>
        </div>
        {canManage && (
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-ghost btn-sm" onClick={() => setEditing(true)}>{t("logistics.common.edit")}</button>
            <button className="btn btn-ghost btn-sm" disabled={busy} onClick={toggleActive}>{d.active ? t("logistics.destinations.deactivate") : t("logistics.common.activate")}</button>
          </div>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 12, marginBottom: 18 }}>
        <Kpi label={t("logistics.destinations.kpiTotal")} value={String(stats.totalDeliveries)} />
        <Kpi label={t("logistics.destinations.kpiTotalQty")} value={`${num(stats.totalQuantity)} t`} />
        <Kpi label={t("logistics.destinations.kpiMonth")} value={String(stats.deliveriesThisMonth)} />
        <Kpi label={t("logistics.destinations.kpiMonthQty")} value={`${num(stats.quantityThisMonth)} t`} />
        <Kpi label={t("logistics.destinations.kpiYearQty")} value={`${num(stats.quantityThisYear)} t`} />
        <Kpi label={t("logistics.destinations.kpiAvg")} value={`${num(stats.avgQuantity)} t`} />
        <Kpi label={t("logistics.destinations.kpiLast")} value={fmtDate(stats.lastDeliveryAt)} />
        {stats.topTruck && <Kpi label={t("logistics.destinations.kpiTopTruck")} value={stats.topTruck} />}
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

      <div className="glass panel" style={{ overflowX: "auto" }}>
        <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 16, margin: "0 0 10px" }}>{t("logistics.destinations.historyTitle")}</h3>
        {history.length === 0 ? <div style={{ fontSize: 13, color: "var(--muted)" }}>{t("logistics.destinations.historyEmpty")}</div> : (
          <>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr>
                <th style={th}>{t("logistics.destinations.hDate")}</th>
                <th style={th}>{t("logistics.destinations.hInvoice")}</th>
                <th style={th}>{t("logistics.destinations.hProduct")}</th>
                <th style={th}>{t("logistics.destinations.hQuantity")}</th>
                <th style={th}>{t("logistics.destinations.hTruck")}</th>
                <th style={th}>{t("logistics.destinations.hRecipient")}</th>
                <th style={th}>{t("logistics.destinations.hStatus")}</th>
              </tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td style={td}><Link href={`/dashboard/logistics/export/${r.id}`} style={{ color: "var(--navy)", textDecoration: "none" }}>{fmtDate(r.shipmentDate)}</Link></td>
                    <td style={td}>{r.invoiceNumber ?? "—"}</td>
                    <td style={td}>{r.product ?? "—"}</td>
                    <td style={td}>{r.quantity != null ? `${num(r.quantity)} ${r.unit ?? "t"}` : "—"}</td>
                    <td style={td}>{[r.truck, r.trailer].filter(Boolean).join(" / ") || "—"}</td>
                    <td style={td}>{r.recipient ?? "—"}</td>
                    <td style={td}>{r.status ? t(`logistics.destinations.st.${r.status}`) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {pages > 1 && (
              <div style={{ display: "flex", gap: 8, justifyContent: "center", alignItems: "center", marginTop: 12 }}>
                <button className="btn btn-ghost btn-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>←</button>
                <span style={{ fontSize: 12.5, color: "var(--muted)" }}>{page} / {pages}</span>
                <button className="btn btn-ghost btn-sm" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>→</button>
              </div>
            )}
          </>
        )}
      </div>

      {editing && (
        <DestinationFormModal
          mode="edit"
          initial={{ id: d.id, name: d.name, country: d.country ?? "", city: d.city ?? "", postalCode: d.postalCode ?? "", address: d.address ?? "", code: d.code ?? "", note: d.note ?? "", active: d.active }}
          onClose={() => setEditing(false)}
          onSaved={() => { setEditing(false); load(); }}
        />
      )}
    </div>
  );
}
