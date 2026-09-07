"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useT, useI18n } from "@/components/i18n/I18nProvider";
import { ClientFormModal, type ClientForm } from "@/components/app/logistics/ClientFormModal";

type Row = { id: string; name: string; eik: string | null; deliveries: number; quantity: number; lastDelivery: string | null; archived: boolean };
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
  const [showArchived, setShowArchived] = useState(false);
  const [editing, setEditing] = useState<null | "new" | ClientForm>(null);
  const [delTarget, setDelTarget] = useState<Row | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    const qs = new URLSearchParams({ period, sort });
    if (q.trim()) qs.set("q", q.trim());
    if (showArchived) qs.set("archived", "1");
    const r = await fetch(`/api/logistics/clients?${qs}`);
    if (r.ok) { const j = await r.json(); setRows(j.rows ?? []); setKpi(j.kpi ?? null); }
  }
  useEffect(() => { const id = setTimeout(load, 200); return () => clearTimeout(id); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [q, period, sort, showArchived]);

  async function openEdit(id: string) {
    const r = await fetch(`/api/logistics/clients/${id}`);
    if (!r.ok) return;
    const d = await r.json();
    setEditing({ id: d.id, name: d.name ?? "", eik: d.eik ?? "", vatNumber: d.vatNumber ?? "", address: d.address ?? "", baseAddress: d.baseAddress ?? "", city: d.city ?? "", country: d.country ?? "", phone: d.phone ?? "", contactEmail: d.contactEmail ?? "", contactPerson: d.contactPerson ?? "" });
  }

  async function confirmDelete() {
    if (!delTarget) return;
    setBusy(true);
    const r = await fetch(`/api/logistics/clients/${delTarget.id}`, { method: "DELETE" });
    setBusy(false); setDelTarget(null);
    if (r.ok) void load();
  }
  async function restore(id: string) {
    setBusy(true);
    const r = await fetch(`/api/logistics/clients/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ archived: false }) });
    setBusy(false);
    if (r.ok) void load();
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
        <label style={{ fontSize: 12, color: "var(--muted)", display: "flex", alignItems: "center", gap: 5 }}>
          <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />{t("logistics.clients.showArchived")}
        </label>
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
                <tr key={r.id} style={{ opacity: r.archived ? 0.55 : 1 }}>
                  <td style={td}><Link href={`/dashboard/logistics/clients/${r.id}`} style={{ fontWeight: 600 }}>{r.name}</Link>{r.eik && <span style={{ color: "var(--muted)", fontSize: 11 }}> · {r.eik}</span>}{r.archived && <span style={{ marginLeft: 6, fontSize: 10, color: "var(--muted)", border: "1px solid var(--border)", borderRadius: 8, padding: "0 6px" }}>{t("logistics.clients.archivedBadge")}</span>}</td>
                  <td style={{ ...td, textAlign: "right", fontWeight: 600 }} className="num">{r.deliveries || "—"}</td>
                  <td style={{ ...td, textAlign: "right" }} className="num">{r.deliveries > 0 ? qtyUnit(r.quantity, "t") : "—"}</td>
                  <td style={td}>{dt(r.lastDelivery)}</td>
                  <td style={{ ...td, textAlign: "right", whiteSpace: "nowrap" }}>
                    <Link href={`/dashboard/logistics/clients/${r.id}`} className="btn btn-ghost btn-sm" style={{ fontSize: 11, padding: "2px 8px" }}>{t("logistics.clients.dossier")}</Link>{" "}
                    {canManage && !r.archived && <button className="btn btn-ghost btn-sm" style={{ fontSize: 11, padding: "2px 8px" }} onClick={() => openEdit(r.id)}>{t("logistics.clients.editClient")}</button>}{" "}
                    {canManage && !r.archived && <button className="btn btn-ghost btn-sm" style={{ fontSize: 11, padding: "2px 8px", color: "var(--brick)" }} onClick={() => setDelTarget(r)}>{t("logistics.common.delete")}</button>}
                    {canManage && r.archived && <button className="btn btn-ghost btn-sm" style={{ fontSize: 11, padding: "2px 8px" }} disabled={busy} onClick={() => restore(r.id)}>{t("logistics.clients.restore")}</button>}
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

      {delTarget && (
        <div onClick={() => setDelTarget(null)} style={{ position: "fixed", inset: 0, background: "rgba(20,30,25,.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 16 }}>
          <div onClick={(e) => e.stopPropagation()} className="glass panel" style={{ maxWidth: 440, width: "100%", background: "var(--paper)" }}>
            <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 17, margin: "0 0 10px", color: "var(--brick)" }}>{t("logistics.clients.deleteTitle")}</h3>
            <div style={{ background: "rgba(0,0,0,.03)", borderRadius: 8, padding: "8px 12px", marginBottom: 12, fontSize: 12.5 }}>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0" }}><span style={{ color: "var(--muted)" }}>{t("logistics.clients.name")}</span><strong>{delTarget.name}</strong></div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0" }}><span style={{ color: "var(--muted)" }}>{t("logistics.clients.fEik")}</span><span>{delTarget.eik ?? "—"}</span></div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0" }}><span style={{ color: "var(--muted)" }}>{t("logistics.clients.deliveries")}</span><span className="num">{delTarget.deliveries}</span></div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0" }}><span style={{ color: "var(--muted)" }}>{t("logistics.clients.quantity")}</span><span className="num">{qtyUnit(delTarget.quantity, "t")}</span></div>
            </div>
            <p style={{ fontSize: 12.5, margin: "0 0 6px" }}>{t("logistics.clients.deleteConfirm")}</p>
            {delTarget.deliveries > 0 && <p style={{ fontSize: 11.5, color: "var(--brass)", margin: "0 0 12px" }}>{t("logistics.clients.deleteHasHistory")}</p>}
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button className="btn btn-ghost btn-sm" onClick={() => setDelTarget(null)} disabled={busy}>{t("logistics.clients.cancel")}</button>
              <button className="btn btn-sm" style={{ background: "var(--brick)", color: "#fff" }} onClick={confirmDelete} disabled={busy}>{t("logistics.clients.deleteConfirmBtn")}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
