"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useT, useI18n } from "@/components/i18n/I18nProvider";

type Carrier = { id: string; name: string };
type Row = { id: string; truck: string; trailer: string | null; carrierName: string | null; driver: string | null; driverPhone: string | null; cargoMode: string; maxPayloadTons: number | null; active: boolean };

export function FleetClient({ carriers, canManage }: { carriers: Carrier[]; canManage: boolean }) {
  const t = useT();
  const { qty, qtyUnit } = useI18n();
  const [rows, setRows] = useState<Row[]>([]);
  const [q, setQ] = useState("");
  const [carrierId, setCarrierId] = useState("");
  const [cargoMode, setCargoMode] = useState("");
  const [active, setActive] = useState("");
  const [driver, setDriver] = useState("");

  async function load() {
    const p = new URLSearchParams();
    if (carrierId) p.set("carrierId", carrierId);
    if (cargoMode) p.set("cargoMode", cargoMode);
    if (active) p.set("active", active);
    if (driver) p.set("driver", driver);
    if (q) p.set("q", q);
    const r = await fetch(`/api/logistics/vehicle-configs?${p}`);
    if (r.ok) setRows(await r.json());
  }
  useEffect(() => { const id = setTimeout(load, 200); return () => clearTimeout(id); }, [carrierId, cargoMode, active, driver, q]);

  const cargoLabel = (m: string) => m === "bulk" ? t("logistics.fleet.bulk") : m === "bags" ? t("logistics.fleet.bags") : "—";
  const th = { textAlign: "left" as const, padding: "7px 8px", color: "var(--muted)", fontSize: 12, whiteSpace: "nowrap" as const };
  const td = { padding: "7px 8px", fontSize: 12.5, borderTop: "1px solid rgba(217,215,200,.5)" };
  const sel = { padding: "6px 9px", fontSize: 12.5 } as const;
  const total = useMemo(() => rows.length, [rows]);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
        <Link href="/dashboard/logistics" style={{ color: "var(--muted)", textDecoration: "none", fontSize: 13 }}>← {t("logistics.fleet.back")}</Link>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 600, margin: 0 }}>{t("logistics.fleet.title")}</h1>
        <Link href="/dashboard/logistics/fleet/review" style={{ marginLeft: "auto", fontSize: 12.5, color: "var(--brick)", textDecoration: "none" }}>{t("logistics.fleet.review.link")} →</Link>
        <span style={{ fontSize: 12.5, color: "var(--muted)" }}>{total} {t("logistics.fleet.configs")}</span>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
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
        <input style={{ ...sel, width: 150 }} value={driver} onChange={(e) => setDriver(e.target.value)} placeholder={t("logistics.fleet.driver")} />
        <select style={sel} value={active} onChange={(e) => setActive(e.target.value)}>
          <option value="">{t("logistics.fleet.allActive")}</option>
          <option value="1">{t("logistics.fleet.activeOnly")}</option>
          <option value="0">{t("logistics.fleet.inactiveOnly")}</option>
        </select>
      </div>

      <div className="glass panel" style={{ overflowX: "auto" }}>
        {rows.length === 0 ? <div style={{ fontSize: 13, color: "var(--muted)" }}>{t("logistics.fleet.empty")}</div> : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr>
              <th style={th}>{t("logistics.fleet.truck")}</th><th style={th}>{t("logistics.fleet.trailer")}</th><th style={th}>{t("logistics.fleet.carrier")}</th>
              <th style={th}>{t("logistics.fleet.driverCol")}</th><th style={th}>{t("logistics.fleet.cargo")}</th><th style={th}>{t("logistics.fleet.maxLoad")}</th>
            </tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} style={{ opacity: r.active ? 1 : 0.5 }}>
                  <td style={td} className="num">{r.truck}</td>
                  <td style={td} className="num">{r.trailer ?? "—"}</td>
                  <td style={td}>{r.carrierName ?? "—"}</td>
                  <td style={td}>{r.driver ?? "—"}{r.driverPhone ? <div style={{ fontSize: 11, color: "var(--muted)" }} className="num">{r.driverPhone}</div> : null}</td>
                  <td style={td}>{cargoLabel(r.cargoMode)}</td>
                  <td style={td} className="num">{r.maxPayloadTons != null ? qtyUnit(r.maxPayloadTons, "t") : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {!canManage && <p style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 10 }}>{t("logistics.fleet.readOnly")}</p>}
    </div>
  );
}
