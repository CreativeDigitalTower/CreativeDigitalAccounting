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
          <span style={{ fontSize: 12, color: "#8A8878" }}>
            ДДС ставки: 20% / 9% / 0% · 1 EUR = 1,95583 лв
          </span>
        </div>
      </div>
    </footer>
  );
}
