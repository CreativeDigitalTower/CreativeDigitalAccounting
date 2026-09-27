"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useI18n, useT } from "@/components/i18n/I18nProvider";

type Row = {
  id: string; name: string; eik: string | null; contact: string | null; phone: string | null; active: boolean;
  vehiclesTotal: number; vehiclesActive: number; trips: number; quantity: number; lastDelivery: string | null;
};
type Kpi = { totalCarriers: number; activeCarriers: number; activeVehicles: number; totalTrips: number; totalQuantity: number; avgQuantity: number; topCarrierId: string | null; topCarrierName: string | null };
type StatusFilter = "all" | "active" | "inactive";
type SortKey = "name" | "trips" | "quantity" | "vehicles" | "last";

const PERIODS = ["current_month", "prev_month", "last_3m", "last_6m", "current_year", "all"] as const;

export function LogisticsCarriers({ canManage }: { canManage: boolean }) {
  const t = useT();
  const { locale, num } = useI18n();
  const [rows, setRows] = useState<Row[]>([]);
  const [kpi, setKpi] = useState<Kpi | null>(null);
  const [range, setRange] = useState<string>("all");
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [sort, setSort] = useState<SortKey>("trips");
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: "", eik: "", contact: "", phone: "", email: "" });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const r = await fetch(`/api/logistics/carriers?range=${range}`);
    if (r.ok) { const j = await r.json(); setRows(j.rows ?? []); setKpi(j.kpi ?? null); }
  }, [range]);
  useEffect(() => { load(); }, [load]);

  async function add() {
    setErr(""); setBusy(true);
    const r = await fetch("/api/logistics/carriers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: form.name, eik: form.eik || null, contact: form.contact || null, phone: form.phone || null, email: form.email || null }) });
    const j = await r.json().catch(() => ({})); setBusy(false);
    if (!r.ok) { setErr(j.error ?? t("logistics.common.err")); return; }
    setForm({ name: "", eik: "", contact: "", phone: "", email: "" }); setAdding(false); load();
  }
  async function patch(id: string, body: unknown) { const r = await fetch(`/api/logistics/carriers/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }); if (r.ok) load(); }

  const view = useMemo(() => {
    let list = rows;
    if (status === "active") list = list.filter((r) => r.active);
    else if (status === "inactive") list = list.filter((r) => !r.active);
    const s = q.trim().toLowerCase();
    if (s) list = list.filter((r) => r.name.toLowerCase().includes(s) || (r.eik ?? "").includes(s) || (r.contact ?? "").toLowerCase().includes(s));
    return [...list].sort((a, b) => {
      if (sort === "trips") return b.trips - a.trips || b.quantity - a.quantity;
      if (sort === "quantity") return b.quantity - a.quantity;
      if (sort === "vehicles") return b.vehiclesActive - a.vehiclesActive;
      if (sort === "last") return (b.lastDelivery ? Date.parse(b.lastDelivery) : 0) - (a.lastDelivery ? Date.parse(a.lastDelivery) : 0);
      return a.name.localeCompare(b.name);
    });
  }, [rows, status, q, sort]);

  const fmtDate = (iso: string | null) => iso ? new Date(iso).toLocaleDateString(locale, { day: "2-digit", month: "2-digit", year: "numeric" }) : "—";
  const inp = { padding: "6px 9px", fontSize: 13 } as const;
  const sel = { padding: "6px 9px", fontSize: 12.5 } as const;
  const th = { textAlign: "left" as const, padding: "7px 8px", color: "var(--muted)", fontSize: 12, whiteSpace: "nowrap" as const };
  const td = { padding: "7px 8px", fontSize: 12.5, borderTop: "1px solid rgba(217,215,200,.5)" };
  const Kcard = ({ label, value }: { label: string; value: string }) => (
    <div className="glass panel" style={{ padding: "9px 13px", minWidth: 110 }}>
      <div style={{ fontSize: 18, fontWeight: 600, fontFamily: "'Fraunces', serif" }}>{value}</div>
      <div style={{ fontSize: 10.5, color: "var(--muted)" }}>{label}</div>
    </div>
  );

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 600, margin: 0 }}>{t("logistics.carriers.title")}</h1>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
          <select style={sel} value={range} onChange={(e) => setRange(e.target.value)}>
            {PERIODS.map((p) => <option key={p} value={p}>{t(`logistics.period.${p}`)}</option>)}
          </select>
          {canManage && <button className="btn btn-primary btn-sm" onClick={() => setAdding((v) => !v)}>{t("logistics.carriers.add")}</button>}
        </div>
      </div>
      {err && <div style={{ color: "var(--brick)", fontSize: 12.5, marginBottom: 10 }}>{err}</div>}

      {kpi && (
        <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
          <Kcard label={t("logistics.carriers.kpiTotal")} value={String(kpi.totalCarriers)} />
          <Kcard label={t("logistics.carriers.kpiActive")} value={String(kpi.activeCarriers)} />
          <Kcard label={t("logistics.carriers.kpiVehicles")} value={String(kpi.activeVehicles)} />
          <Kcard label={t("logistics.carriers.kpiTrips")} value={String(kpi.totalTrips)} />
          <Kcard label={t("logistics.carriers.kpiQuantity")} value={`${num(kpi.totalQuantity)} t`} />
          <Kcard label={t("logistics.carriers.kpiAvg")} value={`${num(kpi.avgQuantity)} t`} />
          {kpi.topCarrierName && <Kcard label={t("logistics.carriers.kpiTop")} value={kpi.topCarrierName} />}
        </div>
      )}

      {canManage && adding && (
        <div className="glass panel" style={{ marginBottom: 14, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "end" }}>
          <div><label style={{ fontSize: 11.5, color: "var(--muted)" }}>{t("logistics.carriers.name")}</label><br /><input style={{ ...inp, width: 180 }} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div><label style={{ fontSize: 11.5, color: "var(--muted)" }}>{t("logistics.carriers.eik")}</label><br /><input style={{ ...inp, width: 110 }} value={form.eik} onChange={(e) => setForm({ ...form, eik: e.target.value })} /></div>
          <div><label style={{ fontSize: 11.5, color: "var(--muted)" }}>{t("logistics.carriers.contact")}</label><br /><input style={{ ...inp, width: 140 }} value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} /></div>
          <div><label style={{ fontSize: 11.5, color: "var(--muted)" }}>{t("logistics.carriers.phone")}</label><br /><input style={{ ...inp, width: 120 }} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
          <button className="btn btn-primary btn-sm" disabled={busy || !form.name} onClick={add}>{t("logistics.common.save")}</button>
        </div>
      )}

      <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
        <input style={{ ...inp, minWidth: 200 }} placeholder={t("logistics.carriers.search")} value={q} onChange={(e) => setQ(e.target.value)} />
        <div style={{ display: "flex", gap: 4 }}>
          {(["all", "active", "inactive"] as const).map((s) => (
            <button key={s} className={`btn btn-sm ${status === s ? "btn-primary" : "btn-ghost"}`} onClick={() => setStatus(s)}>{t(`logistics.fleet.filter_${s}`)}</button>
          ))}
        </div>
        <select style={sel} value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
          <option value="trips">{t("logistics.carriers.sortTrips")}</option>
          <option value="quantity">{t("logistics.carriers.sortQuantity")}</option>
          <option value="vehicles">{t("logistics.carriers.sortVehicles")}</option>
          <option value="last">{t("logistics.carriers.sortLast")}</option>
          <option value="name">{t("logistics.carriers.sortName")}</option>
        </select>
      </div>

      <div className="glass panel" style={{ overflowX: "auto" }}>
        {view.length === 0 ? <div style={{ fontSize: 13, color: "var(--muted)" }}>{t("logistics.carriers.empty")}</div> : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr>
              <th style={th}>{t("logistics.carriers.name")}</th><th style={th}>{t("logistics.carriers.eik")}</th><th style={th}>{t("logistics.carriers.phone")}</th>
              <th style={th}>{t("logistics.carriers.colVehicles")}</th><th style={th}>{t("logistics.carriers.colTrips")}</th><th style={th}>{t("logistics.carriers.colQuantity")}</th>
              <th style={th}>{t("logistics.carriers.colLast")}</th><th style={th}>{t("logistics.common.status")}</th>{canManage && <th style={th}>{t("logistics.common.actions")}</th>}
            </tr></thead>
            <tbody>
              {view.map((c) => (
                <tr key={c.id} style={{ opacity: c.active ? 1 : 0.6 }}>
                  <td style={td}><Link href={`/dashboard/logistics/carriers/${c.id}`} style={{ color: "var(--navy)", fontWeight: 600, textDecoration: "none" }}>{c.name}</Link></td>
                  <td style={td}>{c.eik ?? "—"}</td><td style={td}>{c.phone ?? "—"}</td>
                  <td style={td}>{c.vehiclesActive}{c.vehiclesTotal !== c.vehiclesActive ? ` / ${c.vehiclesTotal}` : ""}</td>
                  <td style={td}>{c.trips}</td><td style={td}>{num(c.quantity)} t</td>
                  <td style={td}>{fmtDate(c.lastDelivery)}</td>
                  <td style={td}>{c.active ? <span style={{ color: "var(--emerald-dark)", fontWeight: 600 }}>{t("logistics.common.active")}</span> : <span style={{ fontSize: 11, fontWeight: 700, color: "#fff", background: "var(--muted)", borderRadius: 20, padding: "2px 9px" }}>{t("logistics.fleet.archived")}</span>}</td>
                  {canManage && <td style={td}><button className="btn btn-ghost btn-sm" onClick={() => patch(c.id, { active: !c.active })}>{c.active ? t("logistics.fleet.archive") : t("logistics.common.activate")}</button></td>}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 8 }}>{t("logistics.carriers.attributionNote")}</div>
    </div>
  );
}
