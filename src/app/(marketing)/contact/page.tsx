"use client";

import { useState } from "react";
import { metaTrack } from "@/lib/metaClient";
import { useT } from "@/components/i18n/I18nProvider";

export default function ContactPage() {
  const t = useT();
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: fd.get("name"),
        email: fd.get("email"),
        company: fd.get("company") || undefined,
        message: fd.get("message"),
      }),
    });
    setLoading(false);
    if (res.ok) {
      try {
        const user = { email: String(fd.get("email") || ""), firstName: String(fd.get("name") || "").split(" ")[0] };
        metaTrack("Contact", { content_name: "Contact form" }, { user });
        metaTrack("Lead", { content_name: "Contact form" }, { user });
      } catch {}
      setSent(true);
    } else setError(t("marketing.contact.error"));
  }

  return (
    <div style={{ maxWidth: 700, margin: "0 auto", padding: "60px 32px 100px" }}>
      <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: "clamp(30px, 5vw, 48px)", fontWeight: 700, margin: "0 0 12px" }}>
        {t("marketing.contact.title")}
      </h1>
      <p style={{ color: "var(--ink-soft)", marginBottom: 40, fontSize: 15 }}>
        {t("marketing.contact.intro")}
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 24 }}>
        <a href="mailto:office@creativedigitalaccounting.com" className="glass panel" style={{ padding: "20px 24px", textDecoration: "none", color: "inherit" }}>
          <div style={{ marginBottom: 8, lineHeight: 0 }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--emerald)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="2.5" y="4.5" width="19" height="15" rx="2.5" /><path d="m3 6 9 6 9-6" /></svg>
          </div>
          <div style={{ fontSize: 11.5, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>{t("marketing.contact.emailLabel")}</div>
          <div style={{ fontSize: 14, color: "var(--navy)", fontWeight: 600 }}>office@creativedigitalaccounting.com</div>
        </a>
        <a href="https://www.facebook.com/CreativeDigitalAccounting" target="_blank" rel="noopener noreferrer" className="glass panel" style={{ padding: "20px 24px", textDecoration: "none", color: "inherit" }}>
          <div style={{ fontSize: 24, marginBottom: 8 }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="#0866FF"><path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.99 3.66 9.13 8.44 9.88v-6.99H7.9V12h2.54V9.8c0-2.5 1.49-3.89 3.78-3.89 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.44 2.89h-2.34v6.99C18.34 21.13 22 16.99 22 12z" /></svg>
          </div>
          <div style={{ fontSize: 11.5, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>{t("marketing.contact.fbLabel")}</div>
          <div style={{ fontSize: 14, color: "#0866FF", fontWeight: 600 }}>{t("marketing.contact.fbCta")}</div>
        </a>
      </div>

      {sent ? (
        <div className="glass" style={{ padding: "32px", borderRadius: 14, textAlign: "center", borderLeft: "4px solid var(--emerald)" }}>
          <div style={{ marginBottom: 12, lineHeight: 0 }}>
            <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="var(--emerald)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ display: "inline-block" }}><circle cx="12" cy="12" r="9.5" /><path d="m8 12 2.5 2.5L16 9" /></svg>
          </div>
          <h3 style={{ fontFamily: "'Fraunces', serif", margin: "0 0 8px" }}>{t("marketing.contact.sentTitle")}</h3>
          <p style={{ color: "var(--ink-soft)", margin: 0 }}>{t("marketing.contact.sentText")}</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="glass panel" style={{ padding: "32px" }}>
          {error && (
            <div style={{ background: "var(--brick-soft)", border: "1px solid var(--brick)", color: "var(--brick)", borderRadius: 8, padding: "10px 14px", fontSize: 13, marginBottom: 16 }}>
              {error}
            </div>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 16, marginBottom: 16 }}>
            <div>
              <label>{t("marketing.contact.fName")}</label>
              <input type="text" name="name" required placeholder={t("marketing.contact.fNamePh")} />
            </div>
            <div>
              <label>{t("marketing.contact.fEmail")}</label>
              <input type="email" name="email" required placeholder={t("marketing.contact.fEmailPh")} />
            </div>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label>{t("marketing.contact.fCompany")}</label>
            <input type="text" name="company" placeholder={t("marketing.contact.fCompanyPh")} />
          </div>
          <div style={{ marginBottom: 24 }}>
            <label>{t("marketing.contact.fMessage")}</label>
            <textarea name="message" required rows={5} placeholder={t("marketing.contact.fMessagePh")} style={{ resize: "vertical" }} />
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: "100%", justifyContent: "center" }}>
            {loading ? t("marketing.contact.submitting") : t("marketing.contact.submit")}
          </button>
        </form>
      )}
    </div>
  );
}
