"use client";
import { useEffect, useState } from "react";
import { useT } from "@/components/i18n/I18nProvider";
import { SearchableSelect } from "@/components/app/logistics/SearchableSelect";
import { buildVehicleQuickCreatePayload } from "@/lib/logistics/vehicleQuickCreate";

type Vehicle = { id: string; registration: string; trailerReg?: string | null };
type Profile = { trailerReg?: string | null } | null;
type ApiVehicle = { id: string; registration: string; active?: boolean; logisticsProfile?: Profile };
type Carrier = { id: string; name: string };

const OWNERSHIP = ["unspecified", "own", "carrier", "subcontractor"];

/**
 * Quick-create на нов автомобил директно от полето „Камион / Ремарке" (§11/§12/§13).
 * Ползва СЪЩИЯ backend като „Автопарк → + Добави влекач" (POST /api/logistics/vehicles):
 * нормализация, dedup, company scoping, permissions. Единственото задължително поле е
 * регистрационният номер; при dedup избира съществуващия автомобил (§6/§23).
 */
export function VehicleQuickCreateModal({ registration, onClose, onDone }: {
  registration: string; onClose: () => void; onDone: (v: Vehicle) => void;
}) {
  const t = useT();
  const [reg, setReg] = useState(registration);
  const [trailer, setTrailer] = useState("");
  const [carrierId, setCarrierId] = useState("");
  const [driver, setDriver] = useState("");
  const [ownership, setOwnership] = useState("unspecified");
  const [carriers, setCarriers] = useState<Carrier[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    fetch("/api/logistics/carriers").then((r) => (r.ok ? r.json() : [])).then((list) => {
      if (Array.isArray(list)) setCarriers(list.map((c: Carrier) => ({ id: c.id, name: c.name })));
    }).catch(() => {});
  }, []);

  const toVehicle = (v: ApiVehicle): Vehicle => ({ id: v.id, registration: v.registration, trailerReg: v.logisticsProfile?.trailerReg ?? null });

  async function submit() {
    setErr("");
    if (reg.trim().length < 2) { setErr(t("logistics.vehicleCreate.required")); return; }
    setBusy(true);
    try {
      const r = await fetch("/api/logistics/vehicles", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildVehicleQuickCreatePayload({ registration: reg, trailerReg: trailer, carrierId, defaultDriver: driver, ownershipType: ownership })),
      });
      const j = await r.json().catch(() => ({}));
      if (r.ok) { onDone(toVehicle(j)); return; }
      // Dedup (§6/§23): endpoint връща съществуващия автомобил → избираме го, без дубликат.
      if (r.status === 409 && j?.existing) { onDone(toVehicle(j.existing)); return; }
      setErr(j?.error ?? t("logistics.vehicleCreate.err"));
    } catch {
      setErr(t("logistics.vehicleCreate.err"));
    } finally { setBusy(false); }
  }

  const lbl = { fontSize: 11.5, color: "var(--muted)", display: "block", marginBottom: 3 } as const;
  const inp = { width: "100%", padding: "6px 9px", fontSize: 13 } as const;

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.4)", zIndex: 120, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div className="glass panel" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 460, width: "100%", padding: 20 }}>
        <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 18, margin: "0 0 4px" }}>{t("logistics.vehicleCreate.title")}</h2>
        <p style={{ fontSize: 12, color: "var(--muted)", margin: "0 0 14px" }}>{t("logistics.vehicleCreate.hint")}</p>
        <div style={{ display: "grid", gap: 10 }}>
          <div><span style={lbl}>{t("logistics.vehicleCreate.registration")} *</span>
            <input style={inp} value={reg} onChange={(e) => setReg(e.target.value)} autoFocus placeholder="SK454Y" /></div>
          <div><span style={lbl}>{t("logistics.vehicleCreate.trailer")}</span>
            <input style={inp} value={trailer} onChange={(e) => setTrailer(e.target.value)} placeholder="SK5022AE" /></div>
          <div><span style={lbl}>{t("logistics.vehicleCreate.carrier")}</span>
            <SearchableSelect options={carriers.map((c) => ({ value: c.id, label: c.name }))} value={carrierId} onChange={setCarrierId} emptyLabel="—" /></div>
          <div style={{ display: "flex", gap: 10 }}>
            <div style={{ flex: 1 }}><span style={lbl}>{t("logistics.vehicleCreate.driver")}</span>
              <input style={inp} value={driver} onChange={(e) => setDriver(e.target.value)} /></div>
            <div style={{ flex: 1 }}><span style={lbl}>{t("logistics.vehicleCreate.ownership")}</span>
              <select style={inp} value={ownership} onChange={(e) => setOwnership(e.target.value)}>
                {OWNERSHIP.map((o) => <option key={o} value={o}>{t(`logistics.vehicles.own_${o}`)}</option>)}
              </select></div>
          </div>
        </div>
        {err && <div style={{ color: "var(--brick)", fontSize: 12.5, marginTop: 10 }}>{err}</div>}
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
          <button className="btn btn-ghost btn-sm" onClick={onClose} disabled={busy}>{t("logistics.common.cancel")}</button>
          <button className="btn btn-primary btn-sm" onClick={submit} disabled={busy}>{busy ? "…" : t("logistics.vehicleCreate.add")}</button>
        </div>
      </div>
    </div>
  );
}
