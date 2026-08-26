"use client";
import { Fragment, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useT, useI18n } from "@/components/i18n/I18nProvider";
import { normalizeRegistration } from "@/lib/logistics/normalize";
import { confirmDelete } from "@/lib/confirmDelete";

type Config = { id: string; trailer: string | null; carrierName: string | null; driver: string | null; driverPhone: string | null; cargoMode: string; maxPayloadTons: number | null; active: boolean; gaps: string[] };
type Row = {
  id: string; registration: string; active: boolean; ownershipType: string | null; aliases: string[];
  trailer: string | null; carrierName: string | null; driver: string | null; driverPhone: string | null;
  cargoMode: string; maxPayloadTons: number | null; configCount: number; configs: Config[]; anyGaps: boolean; _search: string;
};
type Kpi = { total: number; active: number; bulk: number; bags: number; missing: number };
type Carrier = { id: string; name: string };

export function UnifiedFleetClient({ carriers, canManage }: { carriers: Carrier[]; canManage: boolean }) {
  const t = useT();
  const { qtyUnit } = useI18n();
  const [rows, setRows] = useState<Row[]>([]);
  const [kpi, setKpi] = useState<Kpi | null>(null);
  const [archived, setArchived] = useState(false);
  const [q, setQ] = useState("");
  const [carrierId, setCarrierId] = useState("");
  const [cargoMode, setCargoMode] = useState("");
  const [ownership, setOwnership] = useState("");
  const [onlyMissing, setOnlyMissing] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [reg, setReg] = useState("");
  const [err, setErr] = useState("");

  async function load() {
    const r = await fetch(`/api/logistics/fleet${archived ? "?archived=1" : ""}`);
    if (r.ok) { const j = await r.json(); setRows(j.rows); setKpi(j.kpi); }
  }
  useEffect(() => { void load(); }, [archived]);

  async function addVehicle() {
    setErr(""); setBusy(true);
    const r = await fetch("/api/logistics/vehicles", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ registration: reg }) });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) { setErr(j.error ?? t("logistics.common.err")); return; }
    setReg(""); await load();
  }
  async function setActive(id: string, active: boolean) {
    if (active === false && !(await confirmDelete())) return;
    setBusy(true);
    const r = await fetch(`/api/logistics/vehicles/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ active }) });
    setBusy(false); if (r.ok) await load();
  }

  const cargoLabel = (m: string) => m === "bulk" ? t("logistics.fleet.bulk") : m === "bags" ? t("logistics.fleet.bags") : "—";
  const ownLabel = (o: string | null) => t(`logistics.fleet.own.${o ?? "unspecified"}`);

  const filtered = useMemo(() => {
    const nq = normalizeRegistration(q);
    const dq = q.trim().toLowerCase();
    return rows.filter((v) => {
      if (nq && !(v._search.includes(nq) || (v.driver ?? "").toLowerCase().includes(dq) || (v.carrierName ?? "").toLowerCase().includes(dq))) return false;
      if (carrierId && !v.configs.some((c) => c.carrierName === carriers.find((x) => x.id === carrierId)?.name)) return false;
      if (cargoMode && !v.configs.some((c) => c.cargoMode === cargoMode)) return false;
      if (ownership && (v.ownershipType ?? "unspecified") !== ownership) return false;
      if (onlyMissing && !v.anyGaps) return false;
      return true;
    });
  }, [rows, q, carrierId, cargoMode, ownership, onlyMissing, carriers]);

  const th = { textAlign: "left" as const, padding: "7px 8px", color: "var(--muted)", fontSize: 12, whiteSpace: "nowrap" as const };
  const td = { padding: "7px 8px", fontSize: 12.5, borderTop: "1px solid rgba(217,215,200,.5)", verticalAlign: "top" as const };
  const sel = { padding: "6px 9px", fontSize: 12.5 } as const;

  function Kpicard({ label, value, warn }: { label: string; value: number; warn?: boolean }) {
    return (
      <div className="glass panel" style={{ padding: "9px 14px", minWidth: 96 }}>
        <div style={{ fontSize: 20, fontWeight: 600, fontFamily: "'Fraunces', serif", color: warn && value > 0 ? "var(--brick)" : "inherit" }}>{value}</div>
        <div style={{ fontSize: 11, color: "var(--muted)" }}>{label}</div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 600, margin: 0 }}>{t("logistics.fleet.title")}</h1>
        <Link href="/dashboard/logistics/fleet/review" style={{ marginLeft: "auto", fontSize: 12.5, color: "var(--brick)", textDecoration: "none" }}>{t("logistics.fleet.review.link")} →</Link>
      </div>

      {kpi && (
        <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
          <Kpicard label={t("logistics.fleet.vehicles")} value={kpi.total} />
          <Kpicard label={t("logistics.fleet.active")} value={kpi.active} />
          <Kpicard label={t("logistics.fleet.bulk")} value={kpi.bulk} />
          <Kpicard label={t("logistics.fleet.bags")} value={kpi.bags} />
          <Kpicard label={t("logistics.fleet.missingData")} value={kpi.missing} warn />
        </div>
      )}

      {err && <div style={{ color: "var(--brick)", fontSize: 12.5, marginBottom: 10 }}>{err}</div>}
      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap", alignItems: "center" }}>
        <input style={{ ...sel, minWidth: 200 }} value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("logistics.fleet.search")} />
        <select style={sel} value={carrierId} onChange={(e) => setCarrierId(e.target.value)}>
          <option value="">{t("logistics.fleet.allCarriers")}</option>
          {carriers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select style={sel} value={cargoMode} onChange={(e) => setCargoMode(e.target.value)}>
          <option value="">{t("logistics.fleet.allCargo")}</option>
          <option value="bulk">{t("logistics.fleet.bulk")}</option>
          <option value="bags">{t("logistics.fleet.bags")}</option>
        </select>
        <select style={sel} value={ownership} onChange={(e) => setOwnership(e.target.value)}>
          <option value="">{t("logistics.fleet.allOwnership")}</option>
          <option value="own">{t("logistics.fleet.own.own")}</option>
          <option value="carrier">{t("logistics.fleet.own.carrier")}</option>
          <option value="subcontractor">{t("logistics.fleet.own.subcontractor")}</option>
          <option value="unspecified">{t("logistics.fleet.own.unspecified")}</option>
        </select>
        <label style={{ fontSize: 12, color: "var(--muted)", display: "flex", alignItems: "center", gap: 5 }}>
          <input type="checkbox" checked={onlyMissing} onChange={(e) => setOnlyMissing(e.target.checked)} />{t("logistics.fleet.onlyMissing")}
        </label>
        <label style={{ fontSize: 12, color: "var(--muted)", display: "flex", alignItems: "center", gap: 5 }}>
          <input type="checkbox" checked={archived} onChange={(e) => setArchived(e.target.checked)} />{t("logistics.fleet.showArchived")}
        </label>
        {canManage && <span style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
          <input style={{ ...sel, width: 150 }} value={reg} onChange={(e) => setReg(e.target.value)} placeholder={t("logistics.vehicles.registration")} />
          <button className="btn btn-primary btn-sm" disabled={busy || reg.trim().length < 2} onClick={addVehicle}>+ {t("logistics.fleet.addVehicle")}</button>
        </span>}
      </div>

      <div className="glass panel" style={{ overflowX: "auto" }}>
        {filtered.length === 0 ? <div style={{ fontSize: 13, color: "var(--muted)" }}>{t("logistics.fleet.empty")}</div> : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr>
              <th style={th}>{t("logistics.fleet.truck")}</th><th style={th}>{t("logistics.fleet.trailer")}</th><th style={th}>{t("logistics.fleet.carrier")}</th>
              <th style={th}>{t("logistics.fleet.driverCol")}</th><th style={th}>{t("logistics.fleet.cargo")}</th><th style={th}>{t("logistics.fleet.capacity")}</th>
              <th style={th}>{t("logistics.fleet.ownership")}</th><th style={th}>{t("logistics.fleet.actions")}</th>
            </tr></thead>
            <tbody>
              {filtered.map((v) => (
                <Fragment key={v.id}>
                  <tr style={{ opacity: v.active ? 1 : 0.5 }}>
                    <td style={td} className="num">
                      <strong>{v.registration}</strong>
                      {v.aliases.length > 0 && <span style={{ color: "var(--muted)", fontSize: 11 }}> · {v.aliases.join(", ")}</span>}
                      <div style={{ fontSize: 10.5, color: v.active ? "var(--emerald)" : "var(--muted)" }}>{v.active ? t("logistics.fleet.active") : t("logistics.fleet.archived")}</div>
                      {v.configCount > 1 && <button className="btn btn-ghost btn-sm" style={{ padding: "0 6px", fontSize: 11, marginTop: 2 }} onClick={() => setExpanded(expanded === v.id ? null : v.id)}>{expanded === v.id ? "▾" : "▸"} {v.configCount} {t("logistics.fleet.configsCount")}</button>}
                    </td>
                    <td style={td} className="num">{v.trailer ?? "—"}</td>
                    <td style={td}>{v.carrierName ?? "—"}</td>
                    <td style={td}>{v.driver ?? "—"}{v.driverPhone ? <div style={{ fontSize: 11, color: "var(--muted)" }} className="num">{v.driverPhone}</div> : null}</td>
                    <td style={td}>{cargoLabel(v.cargoMode)}</td>
                    <td style={td} className="num">{v.maxPayloadTons != null ? qtyUnit(v.maxPayloadTons, "t") : "—"}</td>
                    <td style={td}>{ownLabel(v.ownershipType)}</td>
                    <td style={td}>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        <Link className="btn btn-ghost btn-sm" style={{ padding: "2px 8px", fontSize: 11 }} href={`/dashboard/logistics/vehicles/${v.id}`}>{t("logistics.fleet.dossier")}</Link>
                        {v.anyGaps && <Link className="btn btn-ghost btn-sm" style={{ padding: "2px 8px", fontSize: 11, color: "var(--brick)" }} href="/dashboard/logistics/fleet/review">{t("logistics.fleet.complete")}</Link>}
                        {canManage && (v.active
                          ? <button className="btn btn-ghost btn-sm" style={{ padding: "2px 8px", fontSize: 11 }} disabled={busy} onClick={() => setActive(v.id, false)}>{t("logistics.fleet.archive")}</button>
                          : <button className="btn btn-ghost btn-sm" style={{ padding: "2px 8px", fontSize: 11 }} disabled={busy} onClick={() => setActive(v.id, true)}>{t("logistics.fleet.activate")}</button>)}
                      </div>
                    </td>
                  </tr>
                  {expanded === v.id && v.configs.map((c) => (
                    <tr key={c.id} style={{ background: "rgba(0,0,0,.02)" }}>
                      <td style={{ ...td, fontSize: 11, color: "var(--muted)" }}>↳ {t("logistics.fleet.configs")}</td>
                      <td style={td} className="num">{c.trailer ?? "—"}</td>
                      <td style={td}>{c.carrierName ?? "—"}</td>
                      <td style={td}>{c.driver ?? "—"}{c.driverPhone ? <span style={{ fontSize: 11, color: "var(--muted)" }} className="num"> · {c.driverPhone}</span> : null}</td>
                      <td style={td}>{cargoLabel(c.cargoMode)}</td>
                      <td style={td} className="num">{c.maxPayloadTons != null ? qtyUnit(c.maxPayloadTons, "t") : "—"}</td>
                      <td style={td} colSpan={2}>{!c.active && <span style={{ fontSize: 11, color: "var(--muted)" }}>{t("logistics.fleet.inactiveOnly")}</span>}</td>
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {!canManage && <p style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 10 }}>{t("logistics.fleet.readOnly")}</p>}
    </div>
  );
}
