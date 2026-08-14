"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useT } from "@/components/i18n/I18nProvider";

type Profile = { trailerReg: string | null; carrierId: string | null; defaultDriver: string | null; ownershipType: string | null };
type Vehicle = { id: string; registration: string; active: boolean; logisticsProfile: Profile | null; aliases: { id: string; alias: string }[] };
type Carrier = { id: string; name: string };

export function LogisticsVehicles({ canManage }: { canManage: boolean }) {
  const t = useT();
  const [items, setItems] = useState<Vehicle[]>([]);
  const [carriers, setCarriers] = useState<Carrier[]>([]);
  const [q, setQ] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [reg, setReg] = useState("");

  async function load() {
    const [rv, rc] = await Promise.all([fetch("/api/logistics/vehicles"), fetch("/api/logistics/carriers")]);
    if (rv.ok) setItems(await rv.json());
    if (rc.ok) setCarriers(await rc.json());
  }
  useEffect(() => { load(); }, []);

  async function add() {
    setErr(""); setBusy(true);
    const r = await fetch("/api/logistics/vehicles", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ registration: reg }) });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) { setErr(j.error ?? t("logistics.common.err")); return; }
    setReg(""); load();
  }
  async function patch(id: string, body: unknown) {
    setBusy(true);
    const r = await fetch(`/api/logistics/vehicles/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    setBusy(false);
    if (r.ok) load();
  }

  const carrierName = (id: string | null | undefined) => id ? (carriers.find((c) => c.id === id)?.name ?? "—") : "—";
  const ownLabel = (o: string | null | undefined) => t(`logistics.vehicles.own_${o ?? "unspecified"}`);
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return items;
    return items.filter((v) => (v.registration + " " + v.aliases.map((a) => a.alias).join(" ")).toLowerCase().includes(s));
  }, [q, items]);

  const th = { textAlign: "left" as const, padding: "7px 8px", color: "var(--muted)", fontSize: 12 };
  const td = { padding: "7px 8px", fontSize: 12.5, borderTop: "1px solid rgba(217,215,200,.5)" };

  return (
    <div>
      <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 600, marginBottom: 14 }}>{t("logistics.vehicles.title")} ({items.length})</h1>
      {err && <div style={{ color: "var(--brick)", fontSize: 12.5, marginBottom: 10 }}>{err}</div>}

      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap", alignItems: "center" }}>
        <input placeholder={t("logistics.common.search")} value={q} onChange={(e) => setQ(e.target.value)} style={{ padding: "7px 10px", fontSize: 13, flex: 1, minWidth: 180 }} />
        {canManage && <>
          <input placeholder={t("logistics.vehicles.registration")} value={reg} onChange={(e) => setReg(e.target.value)} style={{ padding: "7px 10px", fontSize: 13, width: 160 }} />
          <button className="btn btn-primary btn-sm" disabled={busy || reg.length < 2} onClick={add}>{t("logistics.vehicles.add")}</button>
        </>}
      </div>

      <div className="glass panel" style={{ overflowX: "auto" }}>
        {filtered.length === 0 ? <div style={{ fontSize: 13, color: "var(--muted)" }}>{t("logistics.vehicles.empty")}</div> : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr>
              <th style={th}>{t("logistics.vehicles.registration")}</th><th style={th}>{t("logistics.vehicles.trailer")}</th>
              <th style={th}>{t("logistics.vehicles.carrier")}</th><th style={th}>{t("logistics.vehicles.driver")}</th>
              <th style={th}>{t("logistics.vehicles.ownership")}</th><th style={th}>{t("logistics.common.status")}</th>
              <th style={th}>{t("logistics.common.actions")}</th>
            </tr></thead>
            <tbody>
              {filtered.map((v) => (
                <tr key={v.id} style={{ opacity: v.active ? 1 : 0.55 }}>
                  <td style={td}><strong>{v.registration}</strong>{v.aliases.length > 0 && <span style={{ color: "var(--muted)", fontSize: 11 }}> · {v.aliases.map((a) => a.alias).join(", ")}</span>}</td>
                  <td style={td}>{v.logisticsProfile?.trailerReg ?? "—"}</td>
                  <td style={td}>{carrierName(v.logisticsProfile?.carrierId)}</td>
                  <td style={td}>{v.logisticsProfile?.defaultDriver ?? "—"}</td>
                  <td style={td}>{ownLabel(v.logisticsProfile?.ownershipType)}</td>
                  <td style={td}>{v.active ? t("logistics.common.active") : t("logistics.common.inactive")}</td>
                  <td style={td}>
                    <Link className="btn btn-ghost btn-sm" href={`/dashboard/logistics/vehicles/${v.id}`}>{t("logistics.vehicles.dossier")}</Link>{" "}
                    {canManage && <button className="btn btn-ghost btn-sm" onClick={() => patch(v.id, { active: !v.active })}>{v.active ? t("logistics.common.archive") : t("logistics.common.activate")}</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
