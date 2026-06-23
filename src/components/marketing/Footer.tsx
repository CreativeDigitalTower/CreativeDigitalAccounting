import Link from "next/link";
import { Logo } from "@/components/Logo";

export function MarketingFooter() {
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
              Умна бизнес платформа за фактуриране,
              склад и финансови анализи.
            </p>
          </div>
          <div>
            <div style={{ fontSize: 11.5, fontWeight: 600, color: "var(--brass)", letterSpacing: 1, marginBottom: 14 }}>ПРОДУКТ</div>
            {[
              { href: "/software", label: "За Софтуера" },
              { href: "/register", label: "Безплатна регистрация" },
              { href: "/login", label: "Вход за фирми" },
            ].map((l) => (
              <Link key={l.href} href={l.href} style={{ display: "block", color: "#C9C7B6", textDecoration: "none", fontSize: 13.5, marginBottom: 8 }}>
                {l.label}
              </Link>
            ))}
          </div>
          <div>
            <div style={{ fontSize: 11.5, fontWeight: 600, color: "var(--brass)", letterSpacing: 1, marginBottom: 14 }}>КОМПАНИЯ</div>
            {[
              { href: "/about", label: "За Нас" },
              { href: "/contact", label: "Контакти" },
            ].map((l) => (
              <Link key={l.href} href={l.href} style={{ display: "block", color: "#C9C7B6", textDecoration: "none", fontSize: 13.5, marginBottom: 8 }}>
                {l.label}
              </Link>
            ))}
          </div>
          <div>
            <div style={{ fontSize: 11.5, fontWeight: 600, color: "var(--brass)", letterSpacing: 1, marginBottom: 14 }}>ПРАВНО</div>
            {[
              { href: "/privacy", label: "Политика за поверителност" },
              { href: "/terms", label: "Общи условия" },
            ].map((l) => (
              <Link key={l.href} href={l.href} style={{ display: "block", color: "#C9C7B6", textDecoration: "none", fontSize: 13.5, marginBottom: 8 }}>
                {l.label}
              </Link>
            ))}
          </div>
        </div>
        <div style={{ borderTop: "1px solid rgba(255,255,255,.08)", paddingTop: 20, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <span style={{ fontSize: 12.5, color: "#8A8878" }}>
            © {new Date().getFullYear()} Creative Digital Accounting. Всички права запазени.
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
            <span style={{ fontSize: 12, color: "#8A8878" }}>
              1 EUR = 1,95583 лв
            </span>
          </div>
        </div>

        {/* Кредит към Creative Digital Tower */}
        <div style={{ marginTop: 16, textAlign: "center", fontSize: 12.5, color: "#8A8878" }}>
          Създадено от{" "}
          <a
            href="https://creativedigitaltower.com/"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "var(--brass)", fontWeight: 600, textDecoration: "none" }}
          >
            Creative Digital Tower
          </a>{" "}
          · Криейтив Диджитъл Тауър ЕООД · ЕИК 205748188
        </div>
      </div>
    </footer>
  );
}
