"use client";
import { useEffect, useState } from "react";
import { VAT_EXEMPT_REASONS, VAT_RATES } from "@/lib/constants";
import { useT } from "@/components/i18n/I18nProvider";

export function VatSettings() {
  const t = useT();
  const [vatRegistered, setVatRegistered] = useState<boolean | null>(null);
  const [vatNumber, setVatNumber] = useState<string>("");
  const [defaultVatExempt, setDefaultVatExempt] = useState(false);
  const [reason, setReason] = useState("");
  // Фирмена ставка ДДС по подразбиране за нови фактури (§6). null = стандартните 20% (BG).
  const [defaultVatRate, setDefaultVatRate] = useState<number | null>(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/company/vat-settings").then((r) => r.json()).then((d) => {
      setVatRegistered(!!d.vatRegistered);
      setVatNumber(d.vatNumber ?? "");
      setDefaultVatExempt(!!d.defaultVatExempt);
      setReason(d.defaultVatExemptReason ?? "");
      setDefaultVatRate(typeof d.defaultVatRate === "number" ? d.defaultVatRate : null);
    });
  }, []);

  async function save(patch: Record<string, unknown>) {
    setError("");
    const body = { vatRegistered: vatRegistered ?? false, defaultVatExempt, defaultVatExemptReason: reason || null, defaultVatRate, ...patch };
    const res = await fetch("/api/company/vat-settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (res.ok) { setSaved(true); setTimeout(() => setSaved(false), 1500); }
    else setError((await res.json().catch(() => ({}))).error ?? t("account.vat.errSave"));
  }

  if (vatRegistered === null) return null;

  return (
    <div className="glass panel" style={{ padding: "24px 28px", marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
        <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 17, fontWeight: 600, margin: 0 }}>{t("account.vat.title")}</h2>
        {saved && <span style={{ fontSize: 12, color: "var(--emerald-dark)" }}>{t("account.vat.saved")}</span>}
      </div>
      <p style={{ fontSize: 12.5, color: "var(--muted)", margin: "0 0 16px" }}>{t("account.vat.subtitle")}</p>

      {error && <div style={{ background: "var(--brick-soft)", color: "var(--brick)", borderRadius: 8, padding: "9px 12px", fontSize: 12.5, marginBottom: 12 }}>{error}</div>}

      <label style={{ fontSize: 12.5, fontWeight: 600, display: "block", marginBottom: 8 }}>{t("account.vat.regLabel")} {vatNumber && <span style={{ color: "var(--muted)", fontWeight: 400 }}>{t("account.vat.regNoPrefix")} {vatNumber}</span>}</label>
      <div style={{ display: "flex", gap: 16, marginBottom: 8 }}>
        <label style={{ display: "flex", gap: 6, alignItems: "center", fontWeight: 400, cursor: "pointer" }}>
          <input type="radio" checked={vatRegistered === true} onChange={() => { setVatRegistered(true); save({ vatRegistered: true }); }} style={{ width: "auto" }} /> {t("account.vat.registered")}
        </label>
        <label style={{ display: "flex", gap: 6, alignItems: "center", fontWeight: 400, cursor: "pointer" }}>
          <input type="radio" checked={vatRegistered === false} onChange={() => { setVatRegistered(false); save({ vatRegistered: false }); }} style={{ width: "auto" }} /> {t("account.vat.unregistered")}
        </label>
      </div>
      {vatNumber && vatNumber.trim() && vatRegistered === false && (
        <div style={{ fontSize: 12, color: "var(--brick)", marginBottom: 16, fontWeight: 600 }}>
          {t("account.vat.warnHasNo", { vat: vatNumber })}
        </div>
      )}
      {(!vatNumber || !vatRegistered) && <div style={{ marginBottom: 8 }} />}

      {vatRegistered === false && (
        <div style={{ fontSize: 12.5, color: "var(--ink-soft)", background: "var(--brass-soft)", borderRadius: 8, padding: "10px 12px", marginBottom: 16 }}>
          {t("account.vat.autoExempt")}
        </div>
      )}

      <label style={{ display: "flex", gap: 8, alignItems: "center", fontWeight: 400, cursor: "pointer", marginBottom: 12 }}>
        <input type="checkbox" checked={defaultVatExempt} onChange={(e) => { setDefaultVatExempt(e.target.checked); save({ defaultVatExempt: e.target.checked }); }} style={{ width: "auto" }} />
        {t("account.vat.noVatDefault")}
      </label>

      {!defaultVatExempt && vatRegistered !== false && (
        <div style={{ maxWidth: 260, marginBottom: 12 }}>
          <label style={{ fontSize: 12, display: "block", marginBottom: 4 }}>{t("account.vat.defaultRateLabel")}</label>
          <select value={defaultVatRate ?? 20} onChange={(e) => { const v = Number(e.target.value); setDefaultVatRate(v); save({ defaultVatRate: v }); }}>
            {VAT_RATES.map((r) => <option key={r} value={r}>{r}%</option>)}
          </select>
          <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 5 }}>{t("account.vat.defaultRateHint")}</div>
        </div>
      )}

      {(defaultVatExempt || vatRegistered === false) && (
        <div style={{ maxWidth: 560 }}>
          <label style={{ fontSize: 12 }}>{t("account.vat.reasonLabel")}</label>
          <select value={reason} onChange={(e) => { setReason(e.target.value); save({ defaultVatExemptReason: e.target.value || null }); }}>
            <option value="">{t("account.vat.select")}</option>
            {VAT_EXEMPT_REASONS.filter((r) => r.code !== "other").map((r) => <option key={r.code} value={r.code}>{r.label}</option>)}
          </select>
        </div>
      )}
    </div>
  );
}
