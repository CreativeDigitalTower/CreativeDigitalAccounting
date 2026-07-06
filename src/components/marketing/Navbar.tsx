"use client";

import { useState } from "react";
import Link from "next/link";
import { Logo } from "@/components/Logo";

const links = [
  { href: "/", label: "Начало" },
  { href: "/software", label: "За Софтуера" },
  { href: "/accountants", label: "За счетоводители" },
  { href: "/services", label: "Услуги" },
];

const toolsLinks = [
  { href: "/tools/currency", label: "Валутен калкулатор" },
  { href: "/tools/salary", label: "Калкулатор за заплати" },
  { href: "/tools/vat", label: "ДДС калкулатор" },
  { href: "/tools/interest", label: "Лихвен калкулатор" },
  { href: "/tools/markup", label: "Надценка и печалба" },
];

const linksAfter = [
  { href: "/accountants", label: "За счетоводители" },
  { href: "/blog", label: "Блог" },
  { href: "/about", label: "За Нас" },
  { href: "/contact", label: "Контакти" },
];

export function MarketingNavbar() {
  const [open, setOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);

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
              {l.label}
            </Link>
          ))}

          {/* Tools dropdown */}
          <div style={{ position: "relative" }} onMouseEnter={() => setToolsOpen(true)} onMouseLeave={() => setToolsOpen(false)}>
            <Link href="/tools" style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "6px 12px", borderRadius: 8, fontSize: 13.5, fontWeight: 500, color: "var(--ink-soft)", textDecoration: "none" }}>
              Безплатни инструменти
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9" /></svg>
            </Link>
            {toolsOpen && (
              <div className="glass" style={{ position: "absolute", top: "100%", left: 0, minWidth: 230, borderRadius: 10, padding: 6, boxShadow: "0 12px 32px rgba(0,0,0,.14)", zIndex: 60 }}>
                {toolsLinks.map((t) => (
                  <Link key={t.href} href={t.href} style={{ display: "block", padding: "9px 12px", borderRadius: 7, fontSize: 13, color: "var(--ink-soft)", textDecoration: "none" }}>
                    {t.label}
                  </Link>
                ))}
              </div>
            )}
          </div>

          {linksAfter.map((l) => (
            <Link key={l.href} href={l.href} style={{ padding: "6px 12px", borderRadius: 8, fontSize: 13.5, fontWeight: 500, color: "var(--ink-soft)", textDecoration: "none" }}>
              {l.label}
            </Link>
          ))}
        </div>

        {/* Desktop CTAs */}
        <div className="desktop-only" style={{ marginLeft: "auto", gap: 10, alignItems: "center" }}>
          <Link href="/login" className="btn btn-ghost btn-sm">Вход</Link>
          <Link href="/register" className="btn btn-primary btn-sm">Регистрация</Link>
        </div>

        {/* Mobile burger */}
        <button
          className="mobile-only btn btn-ghost btn-sm"
          style={{ marginLeft: "auto" }}
          onClick={() => setOpen(!open)}
          aria-label="Меню"
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
              {l.label}
            </Link>
          ))}
          <Link href="/tools" onClick={() => setOpen(false)} style={{ padding: "11px 8px", fontSize: 15, fontWeight: 600, color: "var(--ink)", textDecoration: "none" }}>
            Безплатни инструменти
          </Link>
          {toolsLinks.map((t) => (
            <Link key={t.href} href={t.href} onClick={() => setOpen(false)} style={{ padding: "9px 8px 9px 22px", fontSize: 14, color: "var(--ink-soft)", textDecoration: "none" }}>
              · {t.label}
            </Link>
          ))}
          {linksAfter.map((l) => (
            <Link key={l.href} href={l.href} onClick={() => setOpen(false)} style={{ padding: "11px 8px", fontSize: 15, fontWeight: 500, color: "var(--ink-soft)", textDecoration: "none" }}>
              {l.label}
            </Link>
          ))}
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <Link href="/login" onClick={() => setOpen(false)} className="btn btn-ghost btn-sm" style={{ flex: 1, justifyContent: "center" }}>Вход</Link>
            <Link href="/register" onClick={() => setOpen(false)} className="btn btn-primary btn-sm" style={{ flex: 1, justifyContent: "center" }}>Регистрация</Link>
          </div>
        </div>
      )}
    </nav>
  );
}
