"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useT } from "@/components/i18n/I18nProvider";
import { FASHION_BASE_PATH } from "@/lib/fashion/config";

type Settings = {
  defaultCurrency: string; laborHourlyRate: number; costingMethod: string;
  overheadMethod: string; overheadValue: number; allowNegativeStock: boolean;
};

export function FashionSettingsForm({ canManage }: { canManage: boolean }) {
  const t = useT();
  const [s, setS] = useState<Settings | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => { fetch("/api/fashion/settings").then((r) => r.ok ? r.json() : null).then(setS); }, []);
  if (!s) return null;

  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => setS({ ...s, [k]: v });

  async function save() {
    setBusy(true); setMsg("");
    const r = await fetch("/api/fashion/settings", {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        defaultCurrency: s!.defaultCurrency, laborHourlyRate: Number(s!.laborHourlyRate),
        costingMethod: s!.costingMethod, overheadMethod: s!.overheadMethod,
        overheadValue: Number(s!.overheadValue), allowNegativeStock: s!.allowNegativeStock,
      }),
    });
    setBusy(false);
    setMsg(r.ok ? `✅ ${t("fashion.settings.saved")}` : `⚠️ ${t("fashion.settings.errSave")}`);
  }

  const lbl = { fontSize: 11.5, color: "var(--muted)", display: "block", marginBottom: 3 } as const;
  const inp = { padding: "6px 9px", fontSize: 13, width: "100%" } as const;

  return (
    <div style={{ maxWidth: 640 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6, flexWrap: "wrap" }}>
        <Link href={FASHION_BASE_PATH} style={{ color: "var(--muted)", textDecoration: "none", fontSize: 13 }}>← {t("fashion.title")}</Link>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 600, margin: 0 }}>{t("fashion.nav.settings")}</h1>
      </div>
      {msg && <div style={{ fontSize: 12.5, marginBottom: 12 }}>{msg}</div>}

      <div className="glass panel" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <h3 style={{ gridColumn: "1 / -1", fontFamily: "'Fraunces', serif", fontSize: 15, margin: "0 0 2px" }}>{t("fashion.settings.general")}</h3>
        <div><label style={lbl}>{t("fashion.settings.currency")}</label>
          <input style={inp} disabled={!canManage} value={s.defaultCurrency} onChange={(e) => set("defaultCurrency", e.target.value.toUpperCase())} /></div>
        <div><label style={lbl}>{t("fashion.settings.laborRate")}</label>
          <input type="number" step="0.01" style={inp} disabled={!canManage} value={s.laborHourlyRate} onChange={(e) => set("laborHourlyRate", Number(e.target.value))} /></div>
        <div><label style={lbl}>{t("fashion.settings.costingMethod")}</label>
          <select style={inp} disabled={!canManage} value={s.costingMethod} onChange={(e) => set("costingMethod", e.target.value)}>
            <option value="weighted_average">{t("fashion.settings.weightedAverage")}</option>
          </select></div>
        <div><label style={lbl}>{t("fashion.settings.overheadMethod")}</label>
          <select style={inp} disabled={!canManage} value={s.overheadMethod} onChange={(e) => set("overheadMethod", e.target.value)}>
            <option value="per_unit">{t("fashion.settings.perUnit")}</option>
            <option value="percent_labor">{t("fashion.settings.percentLabor")}</option>
          </select></div>
        <div><label style={lbl}>{t("fashion.settings.overheadValue")}</label>
          <input type="number" step="0.01" style={inp} disabled={!canManage} value={s.overheadValue} onChange={(e) => set("overheadValue", Number(e.target.value))} /></div>

        <h3 style={{ gridColumn: "1 / -1", fontFamily: "'Fraunces', serif", fontSize: 15, margin: "10px 0 2px" }}>{t("fashion.settings.inventory")}</h3>
        <label style={{ gridColumn: "1 / -1", display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
          <input type="checkbox" disabled={!canManage} checked={s.allowNegativeStock} onChange={(e) => set("allowNegativeStock", e.target.checked)} />
          {t("fashion.settings.allowNegative")}
        </label>
      </div>

      {canManage && (
        <div style={{ marginTop: 14 }}>
          <button className="btn btn-primary" disabled={busy} onClick={save}>{busy ? "…" : t("fashion.settings.save")}</button>
        </div>
      )}
    </div>
  );
}
