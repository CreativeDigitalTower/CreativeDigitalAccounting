"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SECTORS, COMPANY_SIZES, getSector } from "@/lib/workspaces";
import { useT, useI18n } from "@/components/i18n/I18nProvider";

export function BusinessProfileWizard() {
  const t = useT();
  const { messages } = useI18n();
  const subLabels = (id: string): string[] => (messages as unknown as { sectors: { subcat: Record<string, string[]> } }).sectors.subcat[id] ?? [];
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [sectorId, setSectorId] = useState("");
  const [category, setCategory] = useState("");
  const [size, setSize] = useState("");
  const [saving, setSaving] = useState(false);

  const sector = getSector(sectorId);

  async function finish() {
    setSaving(true);
    await fetch("/api/business-profile", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ businessSector: sectorId, businessCategory: category || null, companySize: size || null, applyRecommended: true }),
    });
    router.refresh();
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15,20,18,.6)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, overflowY: "auto" }}>
      <div className="glass panel" style={{ maxWidth: 680, width: "100%", padding: "30px 34px", maxHeight: "92vh", overflowY: "auto" }}>
        {/* Progress */}
        <div style={{ display: "flex", gap: 6, marginBottom: 18 }}>
          {[1, 2, 3, 4].map((s) => (
            <div key={s} style={{ flex: 1, height: 4, borderRadius: 2, background: s <= step ? "var(--emerald)" : "rgba(217,215,200,.6)" }} />
          ))}
        </div>

        {step === 1 && (
          <>
            <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 700, margin: "0 0 4px" }}>{t("sectors.wizard.step1Title")}</h2>
            <p style={{ color: "var(--muted)", fontSize: 13, margin: "0 0 18px" }}>{t("sectors.wizard.step1Desc")}</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 10 }}>
              {SECTORS.map((s) => (
                <button key={s.id} onClick={() => { setSectorId(s.id); setCategory(""); setStep(2); }}
                  className="hover-lift" style={{ cursor: "pointer", textAlign: "center", padding: "16px 10px", borderRadius: 10, border: "1px solid var(--border)", background: "rgba(255,255,255,.6)" }}>
                  <div className="icon-tile" style={{ margin: "0 auto 8px" }}><s.Icon /></div>
                  <div style={{ fontSize: 12.5, fontWeight: 600 }}>{t(`sectors.sector.${s.id}`)}</div>
                </button>
              ))}
            </div>
          </>
        )}

        {step === 2 && sector && (
          <>
            <button onClick={() => setStep(1)} style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: 13, padding: 0, marginBottom: 8 }}>{t("sectors.wizard.back")}</button>
            <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 700, margin: "0 0 4px" }}>{t("sectors.wizard.step2Title", { sector: t(`sectors.sector.${sector.id}`) })}</h2>
            <p style={{ color: "var(--muted)", fontSize: 13, margin: "0 0 18px" }}>{t("sectors.wizard.step2Desc")}</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {sector.subcategories.map((c, i) => (
                <button key={c} onClick={() => { setCategory(c); setStep(3); }}
                  style={{ cursor: "pointer", padding: "9px 16px", borderRadius: 20, border: `1px solid ${category === c ? "var(--emerald)" : "var(--border)"}`, background: category === c ? "var(--emerald-soft)" : "rgba(255,255,255,.5)", fontSize: 13, fontWeight: 600 }}>
                  {subLabels(sector.id)[i] ?? c}
                </button>
              ))}
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <button onClick={() => setStep(2)} style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: 13, padding: 0, marginBottom: 8 }}>{t("sectors.wizard.back")}</button>
            <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 700, margin: "0 0 18px" }}>{t("sectors.wizard.step3Title")}</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {COMPANY_SIZES.map((s) => (
                <button key={s.id} onClick={() => { setSize(s.id); setStep(4); }}
                  style={{ cursor: "pointer", textAlign: "left", padding: "12px 16px", borderRadius: 10, border: `1px solid ${size === s.id ? "var(--emerald)" : "var(--border)"}`, background: size === s.id ? "var(--emerald-soft)" : "rgba(255,255,255,.5)", fontSize: 14, fontWeight: 600 }}>
                  {t(`sectors.size.${s.id}`)}
                </button>
              ))}
            </div>
          </>
        )}

        {step === 4 && (
          <div style={{ textAlign: "center", padding: "10px 0" }}>
            <div style={{ display:"flex",justifyContent:"center",marginBottom: 6, color:"var(--brass)" }}><svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" style={{verticalAlign:"-2px"}}><path d="M3 21 8 8l8 8-13 5Z"/><path d="M14 4c1.5 0 2 1 3 1M18 8c0 1.5 1 2 1 3M13.5 2.5l.5 2"/></svg></div>
            <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 700, margin: "0 0 12px" }}>{t("sectors.wizard.doneTitle")}</h2>
            <p style={{ color: "var(--ink-soft)", fontSize: 14, lineHeight: 1.6, maxWidth: 520, margin: "0 auto 8px" }}>
              {t("sectors.wizard.doneText1")}
            </p>
            <p style={{ color: "var(--muted)", fontSize: 13, lineHeight: 1.6, maxWidth: 520, margin: "0 auto 22px" }}>
              {t("sectors.wizard.doneText2")}
            </p>
            <button className="btn btn-primary" style={{ fontSize: 15, padding: "12px 30px" }} onClick={finish} disabled={saving}>
              {saving ? t("sectors.wizard.preparing") : t("sectors.wizard.toDashboard")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
