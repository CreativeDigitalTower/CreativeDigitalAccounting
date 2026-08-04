"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useT } from "@/components/i18n/I18nProvider";

export type SwitcherCompany = { id: string; name: string; eik: string | null; logoUrl: string | null };

// Постоянен превключвател на активната фирма (за собственик с няколко фирми).
// Сменя само активната фирма (ACTIVE_COMPANY_COOKIE) — потребителят НЕ излиза.
export function CompanySwitcher({ companies, activeId, activeName, activeEik, logoUrl }: {
  companies: SwitcherCompany[]; activeId: string; activeName: string; activeEik: string | null; logoUrl: string | null;
}) {
  const t = useT();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function switchTo(id: string) {
    if (id === activeId) { setOpen(false); return; }
    setBusy(true);
    const res = await fetch("/api/company/switch", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ companyId: id }) });
    setBusy(false); setOpen(false);
    if (res.ok) { window.location.href = "/dashboard"; }
    else router.refresh();
  }

  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((v) => !v)}
        title={t("myCompanies.switch")}
        style={{ display: "block", width: "100%", textAlign: "left", background: "rgba(255,255,255,.06)", borderRadius: 8, padding: "8px 12px", color: "#C9C7B6", border: "1px solid rgba(255,255,255,.08)", cursor: "pointer" }}
      >
        <div style={{ fontSize: 10.5, color: "var(--brass)", fontWeight: 600, letterSpacing: 1, marginBottom: 6, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          {t("navigation.activeCompany")}
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: .7 }}><path d="m6 9 6 6 6-6" /></svg>
        </div>
        {logoUrl && (
          <div style={{ background: "#fff", borderRadius: 6, padding: 6, marginBottom: 8, display: "flex", justifyContent: "center" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logoUrl} alt={activeName} style={{ maxHeight: 36, maxWidth: "100%", objectFit: "contain" }} />
          </div>
        )}
        <div style={{ fontWeight: 600, color: "#E9E7DA", fontSize: 13 }}>{activeName}</div>
        {activeEik && <div style={{ fontSize: 11, color: "#9C9A88" }}>{t("myCompanies.eik")}: {activeEik}</div>}
      </button>

      {open && (
        <div style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 40, marginTop: 4, background: "#1c2620", border: "1px solid rgba(255,255,255,.12)", borderRadius: 8, boxShadow: "0 10px 30px rgba(0,0,0,.4)", overflow: "hidden" }}>
          <div style={{ maxHeight: 260, overflowY: "auto" }}>
            {companies.map((c) => (
              <button key={c.id} onClick={() => switchTo(c.id)} disabled={busy}
                style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", textAlign: "left", padding: "9px 12px", background: c.id === activeId ? "rgba(255,255,255,.08)" : "none", border: "none", borderBottom: "1px solid rgba(255,255,255,.06)", cursor: "pointer", color: "#E9E7DA", fontSize: 12.5 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: c.id === activeId ? "var(--brass)" : "transparent", flexShrink: 0 }} />
                <span style={{ flex: 1 }}>
                  <span style={{ fontWeight: 600 }}>{c.name}</span>
                  {c.eik && <span style={{ display: "block", fontSize: 10.5, color: "#9C9A88" }}>{c.eik}</span>}
                </span>
              </button>
            ))}
          </div>
          <Link href="/dashboard/companies" onClick={() => setOpen(false)} style={{ display: "block", padding: "9px 12px", fontSize: 12, color: "var(--brass)", textDecoration: "none", borderTop: "1px solid rgba(255,255,255,.1)" }}>
            {t("myCompanies.title")}
          </Link>
          <Link href="/dashboard/companies?add=1" onClick={() => setOpen(false)} style={{ display: "block", padding: "9px 12px", fontSize: 12, color: "var(--brass)", textDecoration: "none" }}>
            {t("myCompanies.add")}
          </Link>
        </div>
      )}
    </div>
  );
}
