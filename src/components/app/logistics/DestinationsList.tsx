"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useI18n, useT } from "@/components/i18n/I18nProvider";
import { DestinationFormModal } from "@/components/app/logistics/DestinationFormModal";

type Row = {
  id: string; name: string; country: string | null; city: string | null; active: boolean;
  postalCode: string | null; address: string | null; code: string | null; note: string | null;
  deliveries: number; totalQuantity: number; lastDeliveryAt: string | null;
};
type StatusFilter = "all" | "active" | "inactive";
type SortKey = "name" | "deliveries" | "quantity" | "last";

export function DestinationsList({ canManage }: { canManage: boolean }) {
  const t = useT();
  const { locale, num } = useI18n();
  const [items, setItems] = useState<Row[]>([]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [country, setCountry] = useState<string>("");
  const [sort, setSort] = useState<SortKey>("name");
  const [adding, setAdding] = useState(false);
  const [editRow, setEditRow] = useState<Row | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() { const r = await fetch("/api/logistics/destinations"); if (r.ok) setItems(await r.json()); }
  useEffect(() => { load(); }, []);

  const countries = useMemo(() => [...new Set(items.map((i) => i.country).filter((c): c is string => !!c))].sort(), [items]);

  const view = useMemo(() => {
    let list = items;
    if (status === "active") list = list.filter((i) => i.active);
    else if (status === "inactive") list = list.filter((i) => !i.active);
    if (country) list = list.filter((i) => i.country === country);
    const s = q.trim().toLowerCase();
    if (s) list = list.filter((i) => i.name.toLowerCase().includes(s) || (i.country ?? "").toLowerCase().includes(s) || (i.city ?? "").toLowerCase().includes(s));
    const sorted = [...list];
    sorted.sort((a, b) => {
      if (sort === "deliveries") return b.deliveries - a.deliveries;
      if (sort === "quantity") return b.totalQuantity - a.totalQuantity;
      if (sort === "last") return (b.lastDeliveryAt ? Date.parse(b.lastDeliveryAt) : 0) - (a.lastDeliveryAt ? Date.parse(a.lastDeliveryAt) : 0);
      return a.name.localeCompare(b.name);
    });
    return sorted;
  }, [items, status, country, q, sort]);

  async function toggleActive(id: string, active: boolean) {
    setBusyId(id);
    const r = await fetch(`/api/logistics/destinations/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ active: !active }) });
    setBusyId(null);
    if (r.ok) load();
  }

  const fmtDate = (iso: string | null) => iso ? new Date(iso).toLocaleDateString(locale, { day: "2-digit", month: "2-digit", year: "numeric" }) : "—";
  const th = { textAlign: "left" as const, padding: "8px 10px", color: "var(--muted)", fontSize: 12, whiteSpace: "nowrap" as const };
  const td = { padding: "8px 10px", fontSize: 12.5, borderTop: "1px solid rgba(217,215,200,.5)" };
  const chip = (val: StatusFilter, label: string) => (
    <button onClick={() => setStatus(val)} className={`btn btn-sm ${status === val ? "btn-primary" : "btn-ghost"}`}>{label}</button>
  );

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 14 }}>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 600, margin: 0 }}>{t("logistics.destinations.title")}</h1>
        {canManage && <button className="btn btn-primary btn-sm" onClick={() => setAdding(true)}>+ {t("logistics.destinations.add")}</button>}
      </div>

      <div className="glass panel" style={{ marginBottom: 14, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <input style={{ padding: "7px 10px", fontSize: 13, flex: "1 1 220px" }} placeholder={t("logistics.destinations.search")} value={q} onChange={(e) => setQ(e.target.value)} />
        <div style={{ display: "flex", gap: 6 }}>
          {chip("all", t("logistics.destinations.filterAll"))}
          {chip("active", t("logistics.common.active"))}
          {chip("inactive", t("logistics.common.inactive"))}
        </div>
        <select style={{ padding: "7px 10px", fontSize: 13 }} value={country} onChange={(e) => setCountry(e.target.value)}>
          <option value="">{t("logistics.destinations.allCountries")}</option>
          {countries.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select style={{ padding: "7px 10px", fontSize: 13 }} value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
          <option value="name">{t("logistics.destinations.sortName")}</option>
          <option value="deliveries">{t("logistics.destinations.sortDeliveries")}</option>
          <option value="quantity">{t("logistics.destinations.sortQuantity")}</option>
          <option value="last">{t("logistics.destinations.sortLast")}</option>
        </select>
      </div>

      <div className="glass panel" style={{ overflowX: "auto" }}>
        {view.length === 0 ? <div style={{ fontSize: 13, color: "var(--muted)" }}>{t("logistics.destinations.empty")}</div> : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr>
              <th style={th}>{t("logistics.destinations.colName")}</th>
              <th style={th}>{t("logistics.destinations.colCountry")}</th>
              <th style={th}>{t("logistics.destinations.colDeliveries")}</th>
              <th style={th}>{t("logistics.destinations.colQuantity")}</th>
              <th style={th}>{t("logistics.destinations.colLast")}</th>
              <th style={th}>{t("logistics.common.status")}</th>
              {canManage && <th style={th}>{t("logistics.common.actions")}</th>}
            </tr></thead>
            <tbody>
              {view.map((d) => (
                <tr key={d.id} style={{ opacity: d.active ? 1 : 0.6 }}>
                  <td style={td}><Link href={`/dashboard/logistics/destinations/${d.id}`} style={{ color: "var(--navy)", fontWeight: 600, textDecoration: "none" }}>{d.name}</Link></td>
                  <td style={td}>{d.country ?? "—"}</td>
                  <td style={td}>{d.deliveries}</td>
                  <td style={td}>{num(d.totalQuantity)} t</td>
                  <td style={td}>{fmtDate(d.lastDeliveryAt)}</td>
                  <td style={td}>{d.active
                    ? <span style={{ color: "var(--emerald-dark)", fontWeight: 600 }}>{t("logistics.common.active")}</span>
                    : <span style={{ fontSize: 11, fontWeight: 700, color: "#fff", background: "var(--muted)", borderRadius: 20, padding: "2px 9px" }}>{t("logistics.destinations.inactiveBadge")}</span>}</td>
                  {canManage && <td style={td}><div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => setEditRow(d)}>{t("logistics.common.edit")}</button>
                    <button className="btn btn-ghost btn-sm" disabled={busyId === d.id} onClick={() => toggleActive(d.id, d.active)}>{d.active ? t("logistics.destinations.deactivate") : t("logistics.common.activate")}</button>
                  </div></td>}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {adding && <DestinationFormModal mode="create" onClose={() => setAdding(false)} onSaved={() => { setAdding(false); load(); }} />}
      {editRow && <DestinationFormModal mode="edit" initial={{ id: editRow.id, name: editRow.name, country: editRow.country ?? "", city: editRow.city ?? "", postalCode: editRow.postalCode ?? "", address: editRow.address ?? "", code: editRow.code ?? "", note: editRow.note ?? "", active: editRow.active }} onClose={() => setEditRow(null)} onSaved={() => { setEditRow(null); load(); }} />}
    </div>
  );
}
