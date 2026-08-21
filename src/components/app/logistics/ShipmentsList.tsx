"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useT, useI18n } from "@/components/i18n/I18nProvider";
import { SHIPMENT_STATUSES } from "@/lib/logistics/config";

type Shipment = {
  id: string; code: string; dispatchNoteNumber: string | null; dispatchDate: string | null; status: string;
  vehicleRegSnapshot: string | null; productNameSnapshot: string | null; netQuantity: number | null; unit: string; destination: string | null; delayed?: boolean;
};

export function ShipmentsList({ canManage }: { canManage: boolean }) {
  const t = useT();
  const { qty, qtyUnit } = useI18n();
  const [items, setItems] = useState<Shipment[]>([]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");

  async function load() {
    const r = await fetch(`/api/logistics/shipments${status ? `?status=${status}` : ""}`);
    if (r.ok) setItems(await r.json());
  }
  useEffect(() => { load(); }, [status]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return items;
    return items.filter((x) => (`${x.code} ${x.dispatchNoteNumber ?? ""} ${x.vehicleRegSnapshot ?? ""} ${x.productNameSnapshot ?? ""}`).toLowerCase().includes(s));
  }, [q, items]);

  const dt = (s: string | null) => s ? new Date(s).toLocaleDateString() : "—";
  const th = { textAlign: "left" as const, padding: "7px 8px", color: "var(--muted)", fontSize: 12 };
  const td = { padding: "7px 8px", fontSize: 12.5, borderTop: "1px solid rgba(217,215,200,.5)" };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 600, margin: 0 }}>{t("logistics.shipments.title")} ({items.length})</h1>
        {canManage && <Link href="/dashboard/logistics/shipments/new" className="btn btn-primary btn-sm" style={{ marginLeft: "auto" }}>{t("logistics.shipments.add")}</Link>}
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        <input placeholder={t("logistics.common.search")} value={q} onChange={(e) => setQ(e.target.value)} style={{ padding: "7px 10px", fontSize: 13, flex: 1, minWidth: 180 }} />
        <select value={status} onChange={(e) => setStatus(e.target.value)} style={{ padding: "7px 10px", fontSize: 13 }}>
          <option value="">{t("logistics.common.status")}</option>
          {SHIPMENT_STATUSES.map((s) => <option key={s} value={s}>{t(`logistics.shipmentStatus.${s}`)}</option>)}
        </select>
      </div>

      <div className="glass panel" style={{ overflowX: "auto" }}>
        {filtered.length === 0 ? <div style={{ fontSize: 13, color: "var(--muted)" }}>{t("logistics.shipments.empty")}</div> : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr>
              <th style={th}>{t("logistics.shipments.code")}</th><th style={th}>{t("logistics.shipments.dispatchNote")}</th>
              <th style={th}>{t("logistics.shipments.date")}</th><th style={th}>{t("logistics.shipments.vehicle")}</th>
              <th style={th}>{t("logistics.shipments.product")}</th><th style={th}>{t("logistics.shipments.qty")}</th>
              <th style={th}>{t("logistics.shipments.destination")}</th><th style={th}>{t("logistics.common.status")}</th>
            </tr></thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s.id}>
                  <td style={td}><Link href={`/dashboard/logistics/shipments/${s.id}`} style={{ fontWeight: 600 }}>{s.code}</Link></td>
                  <td style={td}>{s.dispatchNoteNumber ?? "—"}</td>
                  <td style={td}>{dt(s.dispatchDate)}</td>
                  <td style={td}>{s.vehicleRegSnapshot ?? "—"}</td>
                  <td style={td}>{s.productNameSnapshot ?? "—"}</td>
                  <td style={td} className="num">{s.netQuantity != null ? qtyUnit(s.netQuantity, s.unit) : "—"}</td>
                  <td style={td}>{s.destination ?? "—"}</td>
                  <td style={td}><span style={{ fontSize: 11, fontWeight: 700, background: "rgba(15,138,106,.12)", color: "var(--emerald-dark,#0F8A6A)", borderRadius: 10, padding: "2px 8px" }}>{t(`logistics.shipmentStatus.${s.status}`)}</span>{s.delayed && <span style={{ fontSize: 11, fontWeight: 700, color: "var(--brick)", marginLeft: 6 }}>{t("logistics.transport.delayedBadge")}</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
