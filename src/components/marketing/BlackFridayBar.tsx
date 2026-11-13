"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { blackFridayActive } from "@/lib/constants";
import { useT } from "@/components/i18n/I18nProvider";

/**
 * Хоризонтална Black Friday лента над навигацията на публичния сайт (§6).
 * Активността се определя по АБСОЛЮТЕН край на кампанията (виж blackFridayActive) —
 * след 30.11.2026 23:59:59 Europe/Sofia лентата изчезва автоматично, без нов deploy и
 * независимо от кеширани страници (клиентът преизчислява при зареждане).
 * Може да се затвори за текущата сесия (sessionStorage).
 */
const DISMISS_KEY = "bf2026_dismissed";

export function BlackFridayBar() {
  const t = useT();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!blackFridayActive()) return;
    let dismissed = false;
    try { dismissed = sessionStorage.getItem(DISMISS_KEY) === "1"; } catch { /* private mode */ }
    if (!dismissed) setShow(true);
  }, []);

  if (!show) return null;

  function dismiss() {
    try { sessionStorage.setItem(DISMISS_KEY, "1"); } catch { /* ignore */ }
    setShow(false);
  }

  return (
    <div className="no-print" role="region" aria-label="Black Friday"
      style={{ background: "#111111", color: "#fff", width: "100%", overflow: "hidden" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", minHeight: 44, padding: "6px 16px", display: "flex", alignItems: "center", justifyContent: "center", gap: 14, flexWrap: "nowrap" }}>
        {/* Пълен текст (desktop/tablet) */}
        <span className="bf-full" style={{ fontSize: 13, fontWeight: 600, letterSpacing: .2, textAlign: "center" }}>
          {t("pricing.bf.barFull")}
        </span>
        {/* Компактен текст (mobile) */}
        <span className="bf-compact" style={{ fontSize: 12.5, fontWeight: 600, textAlign: "center" }}>
          {t("pricing.bf.barCompact")}
        </span>
        <Link href="/#pricing"
          style={{ flexShrink: 0, background: "var(--emerald, #1E9E6A)", color: "#fff", textDecoration: "none", fontSize: 12.5, fontWeight: 700, padding: "6px 14px", borderRadius: 20, whiteSpace: "nowrap" }}>
          <span className="bf-full">{t("pricing.bf.barCta")}</span>
          <span className="bf-compact">{t("pricing.bf.barCtaShort")}</span>
        </Link>
        <button onClick={dismiss} aria-label={t("pricing.bf.dismiss")}
          style={{ flexShrink: 0, background: "transparent", border: "none", color: "rgba(255,255,255,.7)", cursor: "pointer", fontSize: 18, lineHeight: 1, padding: "0 2px" }}>×</button>
      </div>
      <style>{`
        .bf-compact { display: none; }
        @media (max-width: 640px) {
          .bf-full { display: none; }
          .bf-compact { display: inline; }
        }
      `}</style>
    </div>
  );
}
