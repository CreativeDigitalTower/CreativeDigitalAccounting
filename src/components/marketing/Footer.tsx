import Link from "next/link";
import { Logo } from "@/components/Logo";
import { getT } from "@/lib/i18n/server";

export async function MarketingFooter() {
  const { t } = await getT();
  const columns: { title: string; links: { href: string; label: string }[] }[] = [
    {
      title: t("marketing.footer.product"),
      links: [
        { href: "/software", label: t("marketing.footer.links.software") },
        { href: "/services", label: t("marketing.footer.links.services") },
        { href: "/register", label: t("marketing.footer.links.register") },
        { href: "/login", label: t("marketing.footer.links.login") },
      ],
    },
    {
      title: t("marketing.footer.company"),
      links: [
        { href: "/about", label: t("marketing.footer.links.about") },
        { href: "/accountants", label: t("marketing.footer.links.accountants") },
        { href: "/faq", label: t("marketing.footer.links.faq") },
        { href: "/blog", label: t("marketing.footer.links.blog") },
        { href: "/contact", label: t("marketing.footer.links.contact") },
      ],
    },
    {
      title: t("marketing.footer.legal"),
      links: [
        { href: "/terms", label: t("marketing.footer.links.terms") },
        { href: "/privacy", label: t("marketing.footer.links.privacy") },
        { href: "/cookies", label: t("marketing.footer.links.cookies") },
        { href: "/dpa", label: t("marketing.footer.links.dpa") },
        { href: "/license", label: t("marketing.footer.links.license") },
        { href: "/ip-policy", label: t("marketing.footer.links.ip") },
        { href: "/security", label: t("marketing.footer.links.security") },
      ],
    },
  ];

  return (
    <footer
      style={{
        background: "rgba(19,27,23,.92)",
        color: "#C9C7B6",
        padding: "48px 32px 28px",
        marginTop: "auto",
      }}
    >
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 40, marginBottom: 40 }}>
          <div>
            <Logo dark size="md" />
            <p style={{ marginTop: 14, fontSize: 13, lineHeight: 1.6, color: "#8A8878" }}>
              {t("marketing.footer.tagline")}
            </p>
          </div>
          {columns.map((col) => (
            <div key={col.title}>
              <div style={{ fontSize: 11.5, fontWeight: 600, color: "var(--brass)", letterSpacing: 1, marginBottom: 14 }}>{col.title}</div>
              {col.links.map((l) => (
                <Link key={l.href} href={l.href} style={{ display: "block", color: "#C9C7B6", textDecoration: "none", fontSize: 13.5, marginBottom: 8 }}>
                  {l.label}
                </Link>
              ))}
            </div>
          ))}
        </div>
        {/* Скоро: мобилно приложение */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.1)", borderRadius: 12, padding: "12px 16px", marginBottom: 20, flexWrap: "wrap" }}>
          <span style={{ display:"inline-flex", color:"var(--brass)" }}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="7" y="2.5" width="10" height="19" rx="2.5"/><path d="M11 18.5h2"/></svg></span>
          <span style={{ fontSize: 13, color: "#C9C7B6" }}>
            <strong style={{ color: "#E9E7DA" }}>{t("marketing.footer.soonLabel")}</strong> {t("marketing.footer.soonText")}
          </span>
          <span style={{ marginLeft: "auto", fontSize: 10.5, fontWeight: 700, letterSpacing: 1, color: "var(--brass)", border: "1px solid var(--brass)", borderRadius: 12, padding: "2px 10px" }}>{t("marketing.footer.soonBadge")}</span>
        </div>
        <div style={{ borderTop: "1px solid rgba(255,255,255,.08)", paddingTop: 20, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <span style={{ fontSize: 12.5, color: "#8A8878" }}>
            © {new Date().getFullYear()} Creative Digital Accounting. {t("marketing.footer.rights")}
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
            <a
              href="https://www.facebook.com/CreativeDigitalAccounting"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Facebook"
              style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "#C9C7B6", textDecoration: "none", fontSize: 12.5 }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.99 3.66 9.13 8.44 9.88v-6.99H7.9V12h2.54V9.8c0-2.5 1.49-3.89 3.78-3.89 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.44 2.89h-2.34v6.99C18.34 21.13 22 16.99 22 12z" /></svg>
              Facebook
            </a>
            <a
              href="https://www.instagram.com/creative_digital_accounting/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram"
              style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "#C9C7B6", textDecoration: "none", fontSize: 12.5 }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.16c3.2 0 3.58.01 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.42.36 1.06.41 2.23.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.05 1.17-.25 1.8-.41 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.42.16-1.06.36-2.23.41-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.8-.25-2.23-.41a3.7 3.7 0 0 1-1.38-.9 3.7 3.7 0 0 1-.9-1.38c-.16-.42-.36-1.06-.41-2.23C2.17 15.58 2.16 15.2 2.16 12s.01-3.58.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.16 1.06-.36 2.23-.41C8.42 2.17 8.8 2.16 12 2.16Zm0 1.62c-3.15 0-3.52.01-4.76.07-.9.04-1.39.19-1.71.32-.43.17-.74.37-1.06.69-.32.32-.52.63-.69 1.06-.13.32-.28.81-.32 1.71-.06 1.24-.07 1.61-.07 4.76s.01 3.52.07 4.76c.04.9.19 1.39.32 1.71.17.43.37.74.69 1.06.32.32.63.52 1.06.69.32.13.81.28 1.71.32 1.24.06 1.61.07 4.76.07s3.52-.01 4.76-.07c.9-.04 1.39-.19 1.71-.32.43-.17.74-.37 1.06-.69.32-.32.52-.63.69-1.06.13-.32.28-.81.32-1.71.06-1.24.07-1.61.07-4.76s-.01-3.52-.07-4.76c-.04-.9-.19-1.39-.32-1.71a2.85 2.85 0 0 0-.69-1.06 2.85 2.85 0 0 0-1.06-.69c-.32-.13-.81-.28-1.71-.32-1.24-.06-1.61-.07-4.76-.07Zm0 2.76a5.46 5.46 0 1 1 0 10.92 5.46 5.46 0 0 1 0-10.92Zm0 1.62a3.84 3.84 0 1 0 0 7.68 3.84 3.84 0 0 0 0-7.68Zm5.65-2.9a1.28 1.28 0 1 1 0 2.56 1.28 1.28 0 0 1 0-2.56Z" /></svg>
              Instagram
            </a>
            <span style={{ fontSize: 12, color: "#8A8878" }}>
              1 EUR = 1,95583 лв
            </span>
          </div>
        </div>

        {/* Кредит към Creative Digital Tower */}
        <div style={{ marginTop: 16, textAlign: "center", fontSize: 12.5, color: "#8A8878" }}>
          {t("marketing.footer.createdBy")}{" "}
          <a
            href="https://creativedigitaltower.com/"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "var(--brass)", fontWeight: 600, textDecoration: "none" }}
          >
            Creative Digital Tower
          </a>
        </div>
      </div>
    </footer>
  );
}
