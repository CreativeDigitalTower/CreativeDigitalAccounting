"use client";

import { useState } from "react";
import { FACEBOOK_PAGE } from "@/lib/constants";
import { useT } from "@/components/i18n/I18nProvider";

export function MessengerBubble() {
  const t = useT();
  const [open, setOpen] = useState(false);

  return (
    <>
      {open && (
        <div
          className="no-print"
          style={{
            position: "fixed", bottom: 86, right: 22, zIndex: 61, width: 300, maxWidth: "calc(100vw - 44px)",
            borderRadius: 16, overflow: "hidden", boxShadow: "0 16px 50px rgba(0,0,0,.25)", background: "#fff",
          }}
        >
          <div style={{ background: "#0866FF", color: "#fff", padding: "16px 18px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <strong style={{ fontSize: 15 }}>Creative Digital Accounting</strong>
              <button onClick={() => setOpen(false)} aria-label={t("chrome.msgClose")} style={{ background: "rgba(255,255,255,.2)", border: "none", color: "#fff", borderRadius: 6, width: 24, height: 24, cursor: "pointer" }}>×</button>
            </div>
            <div style={{ fontSize: 12.5, opacity: 0.9, marginTop: 2 }}>{t("chrome.msgReplyTime")}</div>
          </div>
          <div style={{ padding: "16px 18px" }}>
            <div style={{ background: "#F0F2F5", borderRadius: 12, padding: "10px 14px", fontSize: 13.5, color: "#1c1e21", marginBottom: 14 }}>
              {t("chrome.msgGreeting")}
            </div>
            <a
              href={`https://m.me/CreativeDigitalAccounting`}
              target="_blank" rel="noopener noreferrer"
              className="btn btn-primary"
              style={{ width: "100%", justifyContent: "center", background: "#0866FF" }}
              data-fb={FACEBOOK_PAGE}
            >
              {t("chrome.msgContinue")}
            </a>
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen(!open)}
        className="fb-bubble no-print"
        aria-label={t("chrome.msgAria")}
        style={{ border: "none", cursor: "pointer" }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M12 2C6.36 2 2 6.13 2 11.7c0 2.91 1.19 5.44 3.14 7.17.16.14.26.35.27.57l.05 1.78c.03.57.62.94 1.14.71l1.98-.87c.17-.07.36-.09.54-.04 1.21.33 2.5.51 3.77.51 5.64 0 10-4.13 10-9.7C22 6.13 17.64 2 12 2zm6 7.46l-2.93 4.66c-.47.74-1.47.93-2.18.4l-2.33-1.75a.6.6 0 00-.72 0l-3.15 2.39c-.42.32-.97-.18-.68-.62l2.93-4.66c.47-.74 1.47-.93 2.18-.4l2.33 1.75a.6.6 0 00.72 0l3.15-2.39c.42-.32.97.18.68.62z" />
        </svg>
        <span className="fb-label">{open ? t("chrome.msgClose") : t("chrome.msgOpen")}</span>
      </button>
    </>
  );
}
