"use client";
import { useState } from "react";
import { useT } from "@/components/i18n/I18nProvider";
import { FeatureRequestModal } from "@/components/app/FeatureRequestModal";

// Компактна premium CTA карта в таблото (§1). Може да се collapse-ва (пази се локално).
export function FeatureRequestCta({ sectorHint = "generic" }: { sectorHint?: string }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("fr_cta_collapsed") === "1";
  });

  function toggle() {
    setCollapsed((c) => { const n = !c; try { localStorage.setItem("fr_cta_collapsed", n ? "1" : "0"); } catch {} return n; });
  }

  if (collapsed) {
    return (
      <div className="glass" style={{ borderRadius: 12, padding: "8px 14px", marginBottom: 18, display: "flex", alignItems: "center", gap: 10, borderLeft: "3px solid var(--brass)", flexWrap: "wrap" }}>
        <span style={{ fontSize: 13, fontWeight: 600 }}>✦ {t("featureRequest.cta.title")}</span>
        <button className="btn btn-primary btn-sm" style={{ marginLeft: "auto" }} onClick={() => setOpen(true)}>{t("featureRequest.cta.button")}</button>
        <button className="btn btn-ghost btn-sm" onClick={toggle}>{t("featureRequest.cta.expand")}</button>
        {open && <FeatureRequestModal onClose={() => setOpen(false)} />}
      </div>
    );
  }

  return (
    <div className="glass" style={{ borderRadius: 14, padding: "18px 22px", marginBottom: 20, borderLeft: "4px solid var(--brass)", background: "linear-gradient(120deg, var(--brass-soft), transparent)", position: "relative" }}>
      <button onClick={toggle} title={t("featureRequest.cta.collapse")} style={{ position: "absolute", top: 10, right: 12, border: 0, background: "none", cursor: "pointer", color: "var(--muted)", fontSize: 16 }}>–</button>
      <div style={{ display: "flex", gap: 18, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 340px" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11.5, fontWeight: 700, color: "var(--brass)", marginBottom: 6 }}>✦ {t("featureRequest.cta.eyebrow")}</div>
          <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 18, fontWeight: 600, margin: "0 0 6px" }}>{t("featureRequest.cta.title")}</h3>
          <p style={{ fontSize: 13, color: "var(--ink-soft)", margin: 0, lineHeight: 1.5 }}>{t("featureRequest.cta.text")}</p>
          {sectorHint !== "generic" && <p style={{ fontSize: 12, color: "var(--brass)", margin: "6px 0 0", fontWeight: 600 }}>{t(`featureRequest.sectorHint.${sectorHint}`)}</p>}
        </div>
        <button className="btn btn-primary" onClick={() => setOpen(true)} style={{ flexShrink: 0 }}>{t("featureRequest.cta.button")}</button>
      </div>
      {open && <FeatureRequestModal onClose={() => setOpen(false)} />}
    </div>
  );
}
