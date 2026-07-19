"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useT } from "@/components/i18n/I18nProvider";

export function CookieConsent() {
  const t = useT();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem("cda_cookie_consent")) setShow(true);
  }, []);

  function decide(value: "all" | "necessary") {
    localStorage.setItem("cda_cookie_consent", value);
    setShow(false);
  }

  if (!show) return null;

  return (
    <div
      className="glass no-print"
      style={{
        position: "fixed", bottom: 16, left: 16, right: 16, zIndex: 80, maxWidth: 720, margin: "0 auto",
        borderRadius: 14, padding: "16px 20px", display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap",
        boxShadow: "0 12px 40px rgba(20,30,25,.18)",
      }}
    >
      <div style={{ flex: 1, minWidth: 240, fontSize: 13, color: "var(--ink-soft)", lineHeight: 1.5 }}>
        {t("chrome.cookieText")}{" "}
        <Link href="/cookies" style={{ color: "var(--navy)", fontWeight: 600 }}>{t("chrome.cookiePolicy")}</Link>.
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={() => decide("necessary")} className="btn btn-ghost btn-sm">{t("chrome.cookieNecessary")}</button>
        <button onClick={() => decide("all")} className="btn btn-primary btn-sm">{t("chrome.cookieAll")}</button>
      </div>
    </div>
  );
}
