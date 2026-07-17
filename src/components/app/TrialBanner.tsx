"use client";

import Link from "next/link";
import { useT } from "@/components/i18n/I18nProvider";

/**
 * Постоянен нотификационен банер най-горе в приложението, който подсеща
 * потребителите на БЕЗПЛАТЕН план да активират безплатен пробен период на
 * избран абонамент, за да разгледат всички функционалности. Видим е през
 * цялото време, докато потребителят е на безплатен план с наличен тест.
 */
export function TrialBanner() {
  const t = useT();
  return (
    <div style={{
      background: "linear-gradient(90deg, var(--emerald), var(--emerald-dark))",
      color: "#fff", padding: "9px 20px", display: "flex", alignItems: "center", gap: 12,
      justifyContent: "center", flexWrap: "wrap", fontSize: 13, lineHeight: 1.4, textAlign: "center",
    }}>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M12 2v4M12 18v4M4.9 4.9l2.8 2.8M16.3 16.3l2.8 2.8M2 12h4M18 12h4M4.9 19.1l2.8-2.8M16.3 7.7l2.8-2.8"/></svg>
        <span dangerouslySetInnerHTML={{ __html: t("common.trialBanner.text") }} />
      </span>
      <Link href="/dashboard/subscription" className="btn btn-sm" style={{ background: "#fff", color: "var(--emerald-dark)", fontWeight: 700, flexShrink: 0, padding: "5px 14px" }}>
        {t("common.trialBanner.cta")}
      </Link>
    </div>
  );
}
