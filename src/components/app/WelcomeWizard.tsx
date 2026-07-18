"use client";

import { useState } from "react";
import Link from "next/link";
import { NavIcon, UiIcon } from "@/components/app/NavIcons";
import { useT } from "@/components/i18n/I18nProvider";

type Status = { hasCompanyData: boolean; hasLogo: boolean; hasClient: boolean; hasInvoice: boolean };

const si = { width: 18, height: 18 };
const steps = (s: Status) => [
  { done: s.hasCompanyData, labelKey: "companyData", href: "/dashboard/settings", icon: <NavIcon.settings {...si} /> },
  { done: s.hasLogo, labelKey: "logo", href: "/dashboard/settings", icon: <UiIcon.star {...si} /> },
  { done: s.hasClient, labelKey: "firstClient", href: "/dashboard/clients/new", icon: <UiIcon.people {...si} /> },
  { done: s.hasInvoice, labelKey: "firstInvoice", href: "/dashboard/documents/new?type=invoice", icon: <NavIcon.invoice {...si} /> },
];

export function WelcomeWizard({ status }: { status: Status }) {
  const t = useT();
  const [hidden, setHidden] = useState(false);
  const items = steps(status);
  const doneCount = items.filter((i) => i.done).length;
  const allDone = doneCount === items.length;

  async function skip() {
    await fetch("/api/onboarding", { method: "POST" });
    setHidden(true);
  }

  if (hidden) return null;

  // Всичко е попълнено → еднократно поздравление, после балончето изчезва завинаги.
  if (allDone) {
    return (
      <div className="glass panel" style={{ padding: "22px 26px", marginBottom: 20, borderLeft: "4px solid var(--emerald)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
        <div>
          <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 20, margin: "0 0 4px", display: "flex", alignItems: "center", gap: 8 }}><UiIcon.party width={20} height={20} /> {t("misc.welcome.allDoneTitle")}</h2>
          <p style={{ color: "var(--ink-soft)", fontSize: 13.5, margin: 0 }}>
            {t("misc.welcome.allDoneText")}
          </p>
        </div>
        <button onClick={skip} className="btn btn-primary btn-sm">{t("misc.welcome.toWork")}</button>
      </div>
    );
  }

  return (
    <div className="glass panel" style={{ padding: "22px 26px", marginBottom: 20, borderLeft: "4px solid var(--brass)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 20, margin: "0 0 4px" }}>{t("misc.welcome.welcomeTitle")}</h2>
          <p style={{ color: "var(--ink-soft)", fontSize: 13.5, margin: 0 }}>{t("misc.welcome.welcomeText")}</p>
        </div>
        <button onClick={skip} className="btn btn-ghost btn-sm">{t("misc.welcome.skip")}</button>
      </div>

      <div style={{ height: 6, background: "rgba(217,215,200,.5)", borderRadius: 4, overflow: "hidden", margin: "16px 0 14px" }}>
        <div style={{ height: "100%", width: `${(doneCount / items.length) * 100}%`, background: "var(--emerald)", borderRadius: 4, transition: "width .3s" }} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10 }}>
        {items.map((step, i) => (
          <Link
            key={i}
            href={step.href}
            style={{
              display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderRadius: 8,
              textDecoration: "none", color: "inherit",
              background: step.done ? "var(--emerald-soft)" : "rgba(255,255,255,.5)",
              border: `1px solid ${step.done ? "rgba(31,111,84,.3)" : "var(--border)"}`,
            }}
          >
            <span style={{ display: "inline-flex", color: step.done ? "var(--emerald)" : "var(--muted)" }}>{step.done ? <UiIcon.check width={18} height={18} /> : step.icon}</span>
            <div>
              <div style={{ fontSize: 11, color: "var(--muted)" }}>{t("misc.welcome.step", { n: i + 1 })}</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: step.done ? "var(--emerald)" : "var(--ink)" }}>{t(`misc.welcome.${step.labelKey}`)}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
