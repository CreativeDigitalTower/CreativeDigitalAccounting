"use client";

import { useState } from "react";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { useT } from "@/components/i18n/I18nProvider";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";

const links = [
  { href: "/", key: "navigation.public.home" },
  { href: "/software", key: "navigation.public.software" },
  { href: "/services", key: "navigation.public.services" },
];

const toolsLinks = [
  { href: "/tools/currency", key: "marketing.nav.tools.currency" },
  { href: "/tools/salary", key: "marketing.nav.tools.salary" },
  { href: "/tools/vat", key: "marketing.nav.tools.vat" },
  { href: "/tools/interest", key: "marketing.nav.tools.interest" },
  { href: "/tools/markup", key: "marketing.nav.tools.markup" },
];

// Блог и „За нас" са преместени във футъра (колона „КОМПАНИЯ"), за да е
// главното меню по-подредено. Тук остават само основните продуктови връзки.
const linksAfter = [
  { href: "/accountants", key: "navigation.public.accountants" },
  { href: "/contact", key: "navigation.public.contact" },
];

export function MarketingNavbar() {
  const [open, setOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const t = useT();

  return (
    <nav
      className="glass no-print"
      style={{ position: "sticky", top: 0, zIndex: 50, padding: "0 24px", borderRadius: 0, borderLeft: "none", borderRight: "none", borderTop: "none" }}
    >
      <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", alignItems: "center", height: 64, gap: 24 }}>
        <Link href="/" style={{ textDecoration: "none" }}>
          <Logo />
        </Link>

        {/* Desktop links */}
        <div className="desktop-only" style={{ gap: 4, flex: 1, alignItems: "center" }}>
          {links.map((l) => (
            <Link key={l.href} href={l.href} style={{ padding: "6px 12px", borderRadius: 8, fontSize: 13.5, fontWeight: 500, color: "var(--ink-soft)", textDecoration: "none" }}>
              {t(l.key)}
            </Link>
          ))}

          {/* Tools dropdown */}
          <div style={{ position: "relative" }} onMouseEnter={() => setToolsOpen(true)} onMouseLeave={() => setToolsOpen(false)}>
            <Link href="/tools" style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "6px 12px", borderRadius: 8, fontSize: 13.5, fontWeight: 500, color: "var(--ink-soft)", textDecoration: "none" }}>
              {t('navigation.tools')}
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9" /></svg>
            </Link>
            {toolsOpen && (
              <div className="glass" style={{ position: "absolute", top: "100%", left: 0, minWidth: 230, borderRadius: 10, padding: 6, boxShadow: "0 12px 32px rgba(0,0,0,.14)", zIndex: 60 }}>
                {toolsLinks.map((tool) => (
                  <Link key={tool.href} href={tool.href} style={{ display: "block", padding: "9px 12px", borderRadius: 7, fontSize: 13, color: "var(--ink-soft)", textDecoration: "none" }}>
                    {t(tool.key)}
                  </Link>
                ))}
              </div>
            )}
          </div>

          {linksAfter.map((l) => (
            <Link key={l.href} href={l.href} style={{ padding: "6px 12px", borderRadius: 8, fontSize: 13.5, fontWeight: 500, color: "var(--ink-soft)", textDecoration: "none" }}>
              {t(l.key)}
            </Link>
          ))}
        </div>

        {/* Desktop CTAs */}
        <div className="desktop-only" style={{ marginLeft: "auto", gap: 10, alignItems: "center" }}>
          <LanguageSwitcher />
          <Link href="/login" className="btn btn-ghost btn-sm">{t('navigation.public.login')}</Link>
          <Link href="/register" className="btn btn-primary btn-sm">{t('navigation.public.register')}</Link>
        </div>

        {/* Mobile burger */}
        <button
          className="mobile-only btn btn-ghost btn-sm"
          style={{ marginLeft: "auto" }}
          onClick={() => setOpen(!open)}
          aria-label={t("marketing.menu")}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {open
              ? <><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></>
              : <><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></>}
          </svg>
        </button>
      </div>

      {/* Mobile dropdown */}
      {open && (
        <div className="mobile-only" style={{ flexDirection: "column", padding: "8px 0 16px", borderTop: "1px solid var(--border)", gap: 2 }}>
          {links.map((l) => (
            <Link key={l.href} href={l.href} onClick={() => setOpen(false)} style={{ padding: "11px 8px", fontSize: 15, fontWeight: 500, color: "var(--ink-soft)", textDecoration: "none" }}>
              {t(l.key)}
            </Link>
          ))}
          <Link href="/tools" onClick={() => setOpen(false)} style={{ padding: "11px 8px", fontSize: 15, fontWeight: 600, color: "var(--ink)", textDecoration: "none" }}>
            {t('navigation.tools')}
          </Link>
          {toolsLinks.map((tool) => (
            <Link key={tool.href} href={tool.href} onClick={() => setOpen(false)} style={{ padding: "9px 8px 9px 22px", fontSize: 14, color: "var(--ink-soft)", textDecoration: "none" }}>
              · {t(tool.key)}
            </Link>
          ))}
          {linksAfter.map((l) => (
            <Link key={l.href} href={l.href} onClick={() => setOpen(false)} style={{ padding: "11px 8px", fontSize: 15, fontWeight: 500, color: "var(--ink-soft)", textDecoration: "none" }}>
              {t(l.key)}
            </Link>
          ))}
          <div style={{ display: "flex", gap: 8, marginTop: 8, alignItems: "center" }}>
            <LanguageSwitcher />
            <Link href="/login" onClick={() => setOpen(false)} className="btn btn-ghost btn-sm" style={{ flex: 1, justifyContent: "center" }}>{t('navigation.public.login')}</Link>
            <Link href="/register" onClick={() => setOpen(false)} className="btn btn-primary btn-sm" style={{ flex: 1, justifyContent: "center" }}>{t('navigation.public.register')}</Link>
          </div>
        </div>
      )}
    </nav>
  );
}
