"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/components/i18n/I18nProvider";

export type VehicleRow = {
  id: string; registration: string; brand: string | null; model: string | null;
  fuelType: string | null; fuelNorm: number | null; tankCapacity: number | null; year: number | null;
};

const empty = { registration: "", brand: "", model: "", vin: "", fuelType: "дизел", fuelNorm: "", tankCapacity: "", year: "" };

// Компактно управление на фирмени автомобили (списък + добавяне). Данните се
// ползват за авто-попълване на пътни листове/отчети за гориво в „Бизнес документи".
export function VehiclesClient({ initial }: { initial: VehicleRow[] }) {
  const t = useT();
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [f, setF] = useState({ ...empty });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  function set<K extends keyof typeof f>(k: K, v: string) { setF((p) => ({ ...p, [k]: v })); }

  async function save() {
    setErr("");
    if (!f.registration.trim()) { setErr(t("vehicles.errReg")); return; }
    setBusy(true);
    const res = await fetch("/api/vehicles", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        registration: f.registration, brand: f.brand || null, model: f.model || null, vin: f.vin || null,
        fuelType: f.fuelType || null,
        fuelNorm: f.fuelNorm ? Number(f.fuelNorm) : null,
        tankCapacity: f.tankCapacity ? Number(f.tankCapacity) : null,
        year: f.year ? Number(f.year) : null,
      }),
    });
    setBusy(false);
    if (res.ok) { setShowForm(false); setF({ ...empty }); router.refresh(); }
    else setErr((await res.json().catch(() => ({}))).error ?? t("vehicles.errGeneric"));
  }

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 25, fontWeight: 600, margin: "0 0 3px" }}>{t("vehicles.title")}</h1>
          <div style={{ color: "var(--muted)", fontSize: 13 }}>{t("vehicles.subtitle")}</div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm((v) => !v)}>{showForm ? t("vehicles.cancel") : t("vehicles.add")}</button>
      </div>

      {err && <div style={{ background: "var(--brick-soft)", color: "var(--brick)", borderRadius: 8, padding: "8px 12px", fontSize: 13, marginBottom: 12 }}>{err}</div>}

      {showForm && (
        <div className="glass panel" style={{ padding: "16px 18px", marginBottom: 16, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, alignItems: "end" }}>
          <div><label>{t("vehicles.reg")}</label><input value={f.registration} onChange={(e) => set("registration", e.target.value)} placeholder="СА1234ВС" /></div>
          <div><label>{t("vehicles.brand")}</label><input value={f.brand} onChange={(e) => set("brand", e.target.value)} /></div>
          <div><label>{t("vehicles.model")}</label><input value={f.model} onChange={(e) => set("model", e.target.value)} /></div>
          <div><label>{t("vehicles.fuel")}</label>
            <select value={f.fuelType} onChange={(e) => set("fuelType", e.target.value)}>
              {["дизел", "бензин", "газ/LPG", "метан/CNG", "електрически", "хибрид"].map((x) => <option key={x} value={x}>{x}</option>)}
            </select>
          </div>
          <div><label>{t("vehicles.norm")}</label><input value={f.fuelNorm} onChange={(e) => set("fuelNorm", e.target.value)} placeholder="7.5" inputMode="decimal" /></div>
          <div><label>{t("vehicles.tank")}</label><input value={f.tankCapacity} onChange={(e) => set("tankCapacity", e.target.value)} placeholder="60" inputMode="decimal" /></div>
          <div><label>{t("vehicles.year")}</label><input value={f.year} onChange={(e) => set("year", e.target.value)} placeholder="2020" inputMode="numeric" /></div>
          <div><label>{t("vehicles.vin")}</label><input value={f.vin} onChange={(e) => set("vin", e.target.value)} /></div>
          <button className="btn btn-primary btn-sm" onClick={save} disabled={busy}>{busy ? "…" : t("vehicles.save")}</button>
        </div>
      )}

      {initial.length === 0 ? (
        <div className="glass panel" style={{ textAlign: "center", padding: "40px 0", color: "var(--muted)", fontSize: 13 }}>{t("vehicles.empty")}</div>
      ) : (
        <div className="glass panel bi-table" style={{ padding: "8px 0", overflowX: "auto" }}>
          <table>
            <thead><tr>
              <th>{t("vehicles.reg")}</th><th>{t("vehicles.brand")} / {t("vehicles.model")}</th><th>{t("vehicles.fuel")}</th>
              <th className="num">{t("vehicles.norm")}</th><th className="num">{t("vehicles.tank")}</th><th className="num">{t("vehicles.year")}</th>
            </tr></thead>
            <tbody>
              {initial.map((v) => (
                <tr key={v.id}>
                  <td style={{ fontWeight: 700 }}>{v.registration}</td>
                  <td>{[v.brand, v.model].filter(Boolean).join(" ") || "—"}</td>
                  <td>{v.fuelType ?? "—"}</td>
                  <td className="num">{v.fuelNorm != null ? `${v.fuelNorm} л` : "—"}</td>
                  <td className="num">{v.tankCapacity != null ? `${v.tankCapacity} л` : "—"}</td>
                  <td className="num">{v.year ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
