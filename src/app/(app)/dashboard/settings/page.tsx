"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CURRENCIES, DOC_LANGUAGES, INVOICE_TEMPLATES, allowedTemplateCount, type PlanId } from "@/lib/constants";
import { TemplatePreview } from "@/components/app/TemplatePreview";
import { BusinessProfileSettings } from "@/components/app/BusinessProfileSettings";
import { EmailPreferences } from "@/components/app/EmailPreferences";
import { VatSettings } from "@/components/app/VatSettings";
import { DocSharingSetting } from "@/components/app/DocSharingSetting";
import { DangerZone } from "@/components/app/DangerZone";
import { useT } from "@/components/i18n/I18nProvider";

type Company = {
  name: string; eik: string | null; vatNumber: string | null; vatRegistered: boolean;
  address: string | null; city: string | null; mol: string | null;
  phone: string | null; email: string | null; website: string | null;
  bankIban: string | null; bankName: string | null; bankBic: string | null;
  logoUrl: string | null; brandColor: string | null;
  defaultCurrency: string; defaultLanguage: string; invoiceTemplate: string;
  invoiceNumberStart: number; plan?: string;
};

export default function SettingsPage() {
  const t = useT();
  const [c, setC] = useState<Company | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/company").then((r) => r.json()).then(setC);
  }, []);

  function set<K extends keyof Company>(key: K, val: Company[K]) {
    setC((prev) => (prev ? { ...prev, [key]: val } : prev));
    setSaved(false);
  }

  async function handleLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 500 * 1024) {
      setError(t("account.settings.logoTooLarge"));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => set("logoUrl", reader.result as string);
    reader.readAsDataURL(file);
  }

  async function handleSave() {
    if (!c) return;
    setSaving(true);
    setError("");
    const res = await fetch("/api/company", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...c, invoiceNumberStart: Number(c.invoiceNumberStart) || 1 }),
    });
    setSaving(false);
    if (res.ok) {
      setSaved(true);
    } else {
      const d = await res.json();
      setError(d.error ?? t("account.settings.errSave"));
    }
  }

  if (!c) return <div style={{ color: "var(--muted)", padding: 40 }}>{t("account.settings.loading")}</div>;

  return (
    <>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 25, fontWeight: 600, margin: "0 0 3px" }}>{t("account.settings.title")}</h1>
        <div style={{ color: "var(--muted)", fontSize: 13 }}>{t("account.settings.subtitle")}</div>
      </div>

      {error && <div style={{ background: "var(--brick-soft)", border: "1px solid var(--brick)", color: "var(--brick)", borderRadius: 8, padding: "10px 14px", fontSize: 13, marginBottom: 16 }}>{error}</div>}
      {saved && <div style={{ background: "var(--emerald-soft)", border: "1px solid var(--emerald)", color: "var(--emerald)", borderRadius: 8, padding: "10px 14px", fontSize: 13, marginBottom: 16 }}>{t("account.settings.saved")}</div>}

      <BusinessProfileSettings />

      {/* Лого + основни данни */}
      <div className="glass panel" style={{ padding: "24px 28px", marginBottom: 16 }}>
        <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 16, margin: "0 0 18px" }}>{t("account.settings.logoTitle")}</h3>
        <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
          <div style={{ width: 110, height: 110, borderRadius: 12, border: "1px dashed var(--border)", display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,.4)", overflow: "hidden" }}>
            {c.logoUrl
              ? <img src={c.logoUrl} alt={t("account.settings.logoAlt")} style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
              : <span style={{ color: "var(--muted)", fontSize: 12 }}>{t("account.settings.noLogo")}</span>}
          </div>
          <div>
            <input type="file" accept="image/*" onChange={handleLogo} style={{ fontSize: 13, marginBottom: 8 }} />
            <div style={{ fontSize: 11.5, color: "var(--muted)" }}>{t("account.settings.logoHint")}</div>
            {c.logoUrl && <button onClick={() => set("logoUrl", null)} className="btn btn-ghost btn-sm" style={{ marginTop: 8 }}>{t("account.settings.removeLogo")}</button>}
          </div>
        </div>
      </div>

      {/* Основни данни */}
      <div className="glass panel" style={{ padding: "24px 28px", marginBottom: 16 }}>
        <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 16, margin: "0 0 18px" }}>{t("account.settings.companyTitle")}</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px,1fr))", gap: 14 }}>
          <div style={{ gridColumn: "1 / -1" }}>
            <label>{t("account.settings.name")}</label>
            <input type="text" value={c.name} onChange={(e) => set("name", e.target.value)} />
          </div>
          <div>
            <label>{t("account.settings.eik")}</label>
            <input type="text" value={c.eik ?? ""} onChange={(e) => set("eik", e.target.value)} />
          </div>
          <div>
            <label>{t("account.settings.vat")}</label>
            <input type="text" value={c.vatNumber ?? ""} onChange={(e) => set("vatNumber", e.target.value)} placeholder="BG205748188" />
          </div>
          <div>
            <label>{t("account.settings.vatReg")}</label>
            <select value={c.vatRegistered ? "1" : "0"} onChange={(e) => set("vatRegistered", e.target.value === "1")}>
              <option value="0">{t("account.settings.vatRegNo")}</option>
              <option value="1">{t("account.settings.vatRegYes")}</option>
            </select>
            {c.vatNumber && c.vatNumber.trim() && !c.vatRegistered && (
              <div style={{ fontSize: 11.5, color: "var(--brick)", marginTop: 4 }}>
                {t("account.settings.vatWarnNoReg")}
              </div>
            )}
            {c.vatRegistered && !(c.vatNumber && c.vatNumber.trim()) && (
              <div style={{ fontSize: 11.5, color: "var(--brick)", marginTop: 4 }}>
                {t("account.settings.vatWarnNeedNo")}
              </div>
            )}
          </div>
          <div>
            <label>{t("account.settings.mol")}</label>
            <input type="text" value={c.mol ?? ""} onChange={(e) => set("mol", e.target.value)} />
          </div>
          <div>
            <label>{t("account.settings.city")}</label>
            <input type="text" value={c.city ?? ""} onChange={(e) => set("city", e.target.value)} />
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <label>{t("account.settings.address")}</label>
            <input type="text" value={c.address ?? ""} onChange={(e) => set("address", e.target.value)} />
          </div>
          <div>
            <label>{t("account.settings.phone")}</label>
            <input type="text" value={c.phone ?? ""} onChange={(e) => set("phone", e.target.value)} />
          </div>
          <div>
            <label>{t("account.settings.email")}</label>
            <input type="email" value={c.email ?? ""} onChange={(e) => set("email", e.target.value)} />
          </div>
          <div>
            <label>{t("account.settings.website")}</label>
            <input type="text" value={c.website ?? ""} onChange={(e) => set("website", e.target.value)} />
          </div>
        </div>
      </div>

      {/* Банкови данни */}
      <div className="glass panel" style={{ padding: "24px 28px", marginBottom: 16 }}>
        <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 16, margin: "0 0 18px" }}>{t("account.settings.bankTitle")}</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px,1fr))", gap: 14 }}>
          <div style={{ gridColumn: "1 / -1" }}>
            <label>IBAN</label>
            <input type="text" value={c.bankIban ?? ""} onChange={(e) => set("bankIban", e.target.value)} placeholder="BG00XXXX00000000000000" />
          </div>
          <div>
            <label>{t("account.settings.bank")}</label>
            <input type="text" value={c.bankName ?? ""} onChange={(e) => set("bankName", e.target.value)} />
          </div>
          <div>
            <label>{t("account.settings.bic")}</label>
            <input type="text" value={c.bankBic ?? ""} onChange={(e) => set("bankBic", e.target.value)} />
          </div>
        </div>
      </div>

      {/* Настройки за документи */}
      <div className="glass panel" style={{ padding: "24px 28px", marginBottom: 16 }}>
        <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 16, margin: "0 0 18px" }}>{t("account.settings.docTitle")}</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px,1fr))", gap: 14 }}>
          <div>
            <label>{t("account.settings.currency")}</label>
            <select value={c.defaultCurrency} onChange={(e) => set("defaultCurrency", e.target.value)}>
              {CURRENCIES.map((cu) => <option key={cu.code} value={cu.code}>{cu.label}</option>)}
            </select>
          </div>
          <div>
            <label>{t("account.settings.language")}</label>
            <select value={c.defaultLanguage} onChange={(e) => set("defaultLanguage", e.target.value)}>
              {DOC_LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
            </select>
          </div>
          <div>
            <label>{t("account.settings.invoiceStart")}</label>
            <input type="number" min={1} value={c.invoiceNumberStart} onChange={(e) => set("invoiceNumberStart", Number(e.target.value) as never)} />
          </div>
        </div>

        {(() => {
          const allowed = allowedTemplateCount((c.plan ?? "free") as PlanId);
          const allowedLabel = allowed === Infinity ? t("account.settings.designAll") : t("account.settings.designFirst", { n: allowed });
          return (
            <>
              <label style={{ marginTop: 18 }}>{t("account.settings.designLabel", { label: allowedLabel })}</label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px,1fr))", gap: 12, marginTop: 6 }}>
                {INVOICE_TEMPLATES.map((tpl, i) => {
                  const locked = allowed !== Infinity && i >= allowed;
                  return (
                    <div
                      key={tpl.id}
                      style={{
                        border: c.invoiceTemplate === tpl.id ? `2px solid ${tpl.accent}` : "1px solid var(--border)",
                        borderRadius: 10, padding: 8, background: c.invoiceTemplate === tpl.id ? "var(--emerald-soft)" : "rgba(255,255,255,.5)", textAlign: "left",
                        opacity: locked ? 0.55 : 1, position: "relative",
                      }}
                    >
                      <div onClick={() => !locked && set("invoiceTemplate", tpl.id)} style={{ cursor: locked ? "not-allowed" : "pointer" }}>
                        <TemplatePreview templateId={tpl.id} showLogo={!!c.logoUrl} />
                        <div style={{ fontSize: 12.5, fontWeight: 600, marginTop: 6, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                          {tpl.name}
                          {locked ? <span title={t("account.settings.locked")} style={{ display: "inline-flex", color: "var(--muted)" }}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg></span> : (c.invoiceTemplate === tpl.id && <span style={{ color: "var(--emerald)" }}>✓</span>)}
                        </div>
                      </div>
                      <a href={`/dashboard/settings/preview?template=${tpl.id}`} target="_blank" rel="noopener noreferrer"
                        style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 5, textAlign: "center", marginTop: 6, fontSize: 11.5, fontWeight: 600, color: "var(--navy)", border: "1px solid var(--border)", borderRadius: 6, padding: "4px 0", textDecoration: "none" }}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></svg> {t("account.settings.preview")}
                      </a>
                    </div>
                  );
                })}
              </div>
              {allowed !== Infinity && (
                <p style={{ fontSize: 11.5, color: "var(--brass)", marginTop: 10 }}>
                  {t("account.settings.upgradeMore")} <Link href="/dashboard/subscription" style={{ color: "var(--navy)", fontWeight: 600 }}>{t("account.settings.upgrade")}</Link>
                </p>
              )}
              <p style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 8 }}>
                {t("account.settings.logoPaidHint")}
              </p>
            </>
          );
        })()}
      </div>

      <VatSettings />

      <EmailPreferences />

      <DocSharingSetting />

      <DangerZone />

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, position: "sticky", bottom: 0, padding: "12px 0" }}>
        <Link href="/dashboard" className="btn btn-ghost">{t("account.settings.back")}</Link>
        <button onClick={handleSave} className="btn btn-primary" disabled={saving}>
          {saving ? t("account.settings.saving") : t("account.settings.save")}
        </button>
      </div>
    </>
  );
}
