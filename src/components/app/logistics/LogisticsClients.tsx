"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useT, useI18n } from "@/components/i18n/I18nProvider";
import { ClientFormModal, type ClientForm } from "@/components/app/logistics/ClientFormModal";

type Row = { id: string; name: string; eik: string | null; deliveries: number; quantity: number; lastDelivery: string | null };
type Kpi = { totalClients: number; deliveries: number; quantity: number; activeClients: number };
const PERIODS = ["this_month", "last_3_months", "last_6_months", "last_12_months", "this_year", "all_time"] as const;
const pKey = (p: string) => p === "this_month" ? "thisMonth" : p === "last_3_months" ? "last3" : p === "last_6_months" ? "last6" : p === "last_12_months" ? "last12" : p === "this_year" ? "thisYear" : "allTime";

export function LogisticsClients({ canManage }: { canManage: boolean }) {
  const t = useT();
  const { qtyUnit } = useI18n();
  const [rows, setRows] = useState<Row[]>([]);
  const [kpi, setKpi] = useState<Kpi | null>(null);
  const [q, setQ] = useState("");
  const [period, setPeriod] = useState("all_time");
  const [sort, setSort] = useState("deliveries_desc");
  const [editing, setEditing] = useState<null | "new" | ClientForm>(null);

  async function load() {
    const qs = new URLSearchParams({ period, sort });
    if (q.trim()) qs.set("q", q.trim());
    const r = await fetch(`/api/logistics/clients?${qs}`);
    if (r.ok) { const j = await r.json(); setRows(j.rows ?? []); setKpi(j.kpi ?? null); }
  }
  useEffect(() => { const id = setTimeout(load, 200); return () => clearTimeout(id); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [q, period, sort]);

  async function openEdit(id: string) {
    const r = await fetch(`/api/logistics/clients/${id}`);
    if (!r.ok) return;
    const d = await r.json();
    setEditing({ id: d.id, name: d.name ?? "", eik: d.eik ?? "", vatNumber: d.vatNumber ?? "", address: d.address ?? "", city: d.city ?? "", country: d.country ?? "", phone: d.phone ?? "", contactEmail: d.contactEmail ?? "", contactPerson: d.contactPerson ?? "" });
  }

  const dt = (s: string | null) => s ? new Date(s).toLocaleDateString() : "—";
  const th = { textAlign: "left" as const, padding: "7px 8px", color: "var(--muted)", fontSize: 11.5, whiteSpace: "nowrap" as const };
  const td = { padding: "7px 8px", fontSize: 12.5, borderTop: "1px solid rgba(217,215,200,.5)" };
  const sel = { padding: "6px 9px", fontSize: 12.5 } as const;
  const kcard = (label: string, val: React.ReactNode) => (<div className="glass panel" style={{ padding: "9px 14px", minWidth: 110 }}><div style={{ fontSize: 19, fontWeight: 600, fontFamily: "'Fraunces', serif" }}>{val}</div><div style={{ fontSize: 11, color: "var(--muted)" }}>{label}</div></div>);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 600, margin: 0 }}>{t("logistics.clients.title")}</h1>
        {canManage && <button className="btn btn-primary btn-sm" style={{ marginLeft: "auto" }} onClick={() => setEditing("new")}>+ {t("logistics.clients.addClient")}</button>}
      </div>

      {kpi && (
        <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
          {kcard(t("logistics.clients.kpiTotal"), kpi.totalClients)}
          {kcard(t("logistics.clients.kpiDeliveries"), kpi.deliveries)}
          {kcard(t("logistics.clients.kpiQuantity"), qtyUnit(kpi.quantity, "t"))}
          {kcard(t("logistics.clients.kpiActive"), kpi.activeClients)}
        </div>
      )}

      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap", alignItems: "center" }}>
        <input placeholder={t("logistics.clients.search")} value={q} onChange={(e) => setQ(e.target.value)} style={{ ...sel, minWidth: 260 }} />
        <select style={sel} value={period} onChange={(e) => setPeriod(e.target.value)} title={t("logistics.period.label")}>
          {PERIODS.map((p) => <option key={p} value={p}>{t(`logistics.period.${pKey(p)}`)}</option>)}
        </select>
        <select style={sel} value={sort} onChange={(e) => setSort(e.target.value)}>
          <option value="deliveries_desc">{t("logistics.clients.sortDeliveries")}</option>
          <option value="quantity_desc">{t("logistics.clients.sortQuantity")}</option>
          <option value="recent">{t("logistics.clients.sortRecent")}</option>
          <option value="name_asc">{t("logistics.clients.sortName")}</option>
        </select>
      </div>

      <div className="glass panel" style={{ overflowX: "auto" }}>
        {rows.length === 0 ? <div style={{ fontSize: 13, color: "var(--muted)" }}>{t("logistics.clients.empty")}</div> : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr>
              <th style={th}>{t("logistics.clients.name")}</th>
              <th style={{ ...th, textAlign: "right" }} title={t("logistics.clients.deliveriesTip")}>{t("logistics.clients.deliveries")}</th>
              <th style={{ ...th, textAlign: "right" }}>{t("logistics.clients.quantity")}</th>
              <th style={th}>{t("logistics.clients.lastDelivery")}</th>
              <th style={{ ...th, textAlign: "right" }}>{t("logistics.common.actions")}</th>
            </tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td style={td}><Link href={`/dashboard/logistics/clients/${r.id}`} style={{ fontWeight: 600 }}>{r.name}</Link>{r.eik && <span style={{ color: "var(--muted)", fontSize: 11 }}> · {r.eik}</span>}</td>
                  <td style={{ ...td, textAlign: "right", fontWeight: 600 }} className="num">{r.deliveries || "—"}</td>
                  <td style={{ ...td, textAlign: "right" }} className="num">{r.deliveries > 0 ? qtyUnit(r.quantity, "t") : "—"}</td>
                  <td style={td}>{dt(r.lastDelivery)}</td>
                  <td style={{ ...td, textAlign: "right", whiteSpace: "nowrap" }}>
                    <Link href={`/dashboard/logistics/clients/${r.id}`} className="btn btn-ghost btn-sm" style={{ fontSize: 11, padding: "2px 8px" }}>{t("logistics.clients.dossier")}</Link>{" "}
                    {canManage && <button className="btn btn-ghost btn-sm" style={{ fontSize: 11, padding: "2px 8px" }} onClick={() => openEdit(r.id)}>{t("logistics.clients.editClient")}</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {editing && (
        <ClientFormModal
          initial={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); void load(); }}
        />
      )}
    </div>
  );
}
