"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SECTORS, COMPANY_SIZES, getSector } from "@/lib/workspaces";
import { useT, useI18n } from "@/components/i18n/I18nProvider";

export function BusinessProfileSettings() {
  const t = useT();
  const { messages } = useI18n();
  const subLabels = (id: string): string[] => (messages as unknown as { sectors: { subcat: Record<string, string[]> } }).sectors.subcat[id] ?? [];
  const router = useRouter();
  const [sector, setSector] = useState("");
  const [category, setCategory] = useState("");
  const [size, setSize] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    fetch("/api/company").then((r) => r.json()).then((c) => {
      setSector(c.businessSector ?? "");
      setCategory(c.businessCategory ?? "");
      setSize(c.companySize ?? "");
      setLoaded(true);
    }).catch(() => setLoaded(true));
  }, []);

  const subs = getSector(sector)?.subcategories ?? [];

  async function save() {
    if (!sector) { setMsg(t("account.businessProfile.chooseSector")); return; }
    const applyRecommended = confirm(t("account.businessProfile.confirmApply"));
    const res = await fetch("/api/business-profile", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ businessSector: sector, businessCategory: category || null, companySize: size || null, applyRecommended }),
    });
    if (res.ok) { setMsg(t("account.businessProfile.savedTick")); router.refresh(); setTimeout(() => setMsg(""), 2500); }
    else setMsg(t("account.businessProfile.errSave"));
  }

  if (!loaded) return null;

  return (
    <div className="glass panel" style={{ padding: "24px 28px", marginBottom: 16 }}>
      <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 16, margin: "0 0 6px" }}>{t("account.businessProfile.title")}</h3>
      <p style={{ fontSize: 12.5, color: "var(--muted)", margin: "0 0 16px" }}>
        {t("account.businessProfile.subtitle")}
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px,1fr))", gap: 14 }}>
        <div>
          <label>{t("account.businessProfile.sector")}</label>
          <select value={sector} onChange={(e) => { setSector(e.target.value); setCategory(""); }}>
            <option value="">{t("account.businessProfile.select")}</option>
            {SECTORS.map((s) => <option key={s.id} value={s.id}>{t(`sectors.sector.${s.id}`)}</option>)}
          </select>
        </div>
        <div>
          <label>{t("account.businessProfile.subcategory")}</label>
          <select value={category} onChange={(e) => setCategory(e.target.value)} disabled={!subs.length}>
            <option value="">{t("account.businessProfile.select")}</option>
            {subs.map((c, i) => <option key={c} value={c}>{subLabels(sector)[i] ?? c}</option>)}
          </select>
        </div>
        <div>
          <label>{t("account.businessProfile.size")}</label>
          <select value={size} onChange={(e) => setSize(e.target.value)}>
            <option value="">{t("account.businessProfile.select")}</option>
            {COMPANY_SIZES.map((s) => <option key={s.id} value={s.id}>{t(`sectors.size.${s.id}`)}</option>)}
          </select>
        </div>
      </div>
      <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 14 }}>
        <button className="btn btn-primary btn-sm" onClick={save}>{t("account.businessProfile.save")}</button>
        {msg && <span style={{ fontSize: 12.5, color: msg.startsWith("✓") ? "var(--emerald)" : "var(--brick)" }}>{msg}</span>}
      </div>
    </div>
  );
}
