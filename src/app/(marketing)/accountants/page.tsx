import Link from "next/link";
import type { Metadata } from "next";
import { ACCOUNTANT_PLANS, ACCOUNTANT_PLAN_FEATURES, EUR_TO_BGN, isPromoActive } from "@/lib/constants";
import { IconBuilding, IconChart, IconUsers, IconFileStack } from "@/components/Icons";

export const metadata: Metadata = {
  title: "За счетоводители и счетоводни къщи | Creative Digital Accounting",
  description: "Специален режим за счетоводни къщи — управлявайте всички клиентски фирми на едно място, с обобщени справки и отделни данни за всяка фирма.",
};

const benefits = [
  { Icon: IconBuilding, title: "Всички клиенти на едно място", desc: "Създайте отделен профил за всяка фирма, за която водите счетоводство, и превключвайте между тях с един клик." },
  { Icon: IconChart, title: "Обобщени справки", desc: "Виждайте сумарно приходите, разходите, печалбата, ДДС статуса и документите на всичките си клиенти." },
  { Icon: IconUsers, title: "Пълен достъп за всеки клиент", desc: "Всяка клиентска фирма получава Про ниво — фактури, склад, разходи, заплати, анализи и всичко останало." },
  { Icon: IconFileStack, title: "Без такса на клиент", desc: "Добавяйте нови клиентски фирми според тарифата си, без допълнителни такси за всяка фирма." },
];

export default function AccountantsPage() {
  const promo = isPromoActive();
  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "60px 32px 90px" }}>
      <div style={{ textAlign: "center", marginBottom: 48 }}>
        <span style={{ display: "inline-block", background: "var(--navy-soft)", color: "var(--navy)", fontSize: 12, fontWeight: 700, letterSpacing: 1, padding: "5px 16px", borderRadius: 20, marginBottom: 16 }}>ЗА СЧЕТОВОДИТЕЛИ И СЧЕТОВОДНИ КЪЩИ</span>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: "clamp(32px, 5vw, 52px)", fontWeight: 700, margin: "0 0 16px" }}>
          Водете счетоводството на<br /><span style={{ color: "var(--emerald)" }}>всичките си клиенти на едно място</span>
        </h1>
        <p style={{ fontSize: 17, color: "var(--ink-soft)", maxWidth: 620, margin: "0 auto 28px", lineHeight: 1.6 }}>
          Специален режим за счетоводни къщи и кантори — създавайте отделен профил за всеки клиент, управлявайте всичко за всяка фирма и следете обобщени данни за целия си портфейл.
        </p>
        <Link href="/register?accountType=accounting" className="btn btn-primary" style={{ fontSize: 15, padding: "12px 28px" }}>Създай профил на счетоводна къща →</Link>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 18, marginBottom: 56 }}>
        {benefits.map((b) => (
          <div key={b.title} className="glass panel hover-lift" style={{ padding: 24 }}>
            <div className="icon-tile" style={{ marginBottom: 12 }}><b.Icon /></div>
            <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 17, margin: "0 0 8px" }}>{b.title}</h3>
            <p style={{ fontSize: 13.5, color: "var(--ink-soft)", margin: 0, lineHeight: 1.55 }}>{b.desc}</p>
          </div>
        ))}
      </div>

      {/* Планове за счетоводители */}
      <div style={{ textAlign: "center", marginBottom: 28 }}>
        <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 34, fontWeight: 700, margin: "0 0 8px" }}>Планове за счетоводители</h2>
        <p style={{ color: "var(--muted)", fontSize: 14 }}>Изберете според броя фирми, които обслужвате · Всички цени са без ДДС</p>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16 }}>
        {ACCOUNTANT_PLANS.map((p) => {
          const hasPromo = promo && p.regularPrice > p.price;
          const price = promo ? p.price : p.regularPrice;
          return (
            <div key={p.id} className="glass panel" style={{ padding: "26px 22px", position: "relative", display: "flex", flexDirection: "column", border: p.recommended ? "2px solid var(--brass)" : undefined }}>
              {p.recommended && <span className="ribbon">Препоръчан</span>}
              <div style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 700, textAlign: "center" }}>{p.name}</div>
              <div style={{ fontSize: 12.5, color: "var(--muted)", textAlign: "center", minHeight: 34, marginTop: 2 }}>{p.tagline}</div>
              <div style={{ textAlign: "center", margin: "10px 0 0" }}>
                {hasPromo && <span className="num" style={{ fontSize: 15, color: "var(--muted)", textDecoration: "line-through", marginRight: 6 }}>{p.regularPrice} €</span>}
                <span className="num" style={{ fontSize: 32, fontWeight: 700, color: hasPromo ? "var(--emerald-dark)" : "var(--ink)" }}>{price}</span>
                <span style={{ fontSize: 14, color: "var(--muted)" }}> € / месец</span>
              </div>
              <div className="num" style={{ fontSize: 11, color: "var(--muted)", textAlign: "center", marginBottom: 8 }}>≈ {(price * EUR_TO_BGN).toFixed(2)} лв/месец</div>
              <div style={{ textAlign: "center", fontSize: 13.5, fontWeight: 700, color: "var(--navy)", background: "var(--navy-soft)", borderRadius: 8, padding: "8px 0", margin: "6px 0 14px" }}>
                {p.maxClients === Infinity ? "Неограничени клиентски фирми" : `До ${p.maxClients} клиентски фирми`}
              </div>
              <ul style={{ listStyle: "none", padding: 0, margin: "0 0 18px", display: "flex", flexDirection: "column", gap: 7, flex: 1 }}>
                {ACCOUNTANT_PLAN_FEATURES.map((f) => (
                  <li key={f} style={{ fontSize: 12.5, color: "var(--ink-soft)", paddingLeft: 18, position: "relative" }}>
                    <span style={{ position: "absolute", left: 0, color: "var(--emerald)", fontWeight: 700 }}>✓</span>{f}
                  </li>
                ))}
              </ul>
              <Link href={`/register?accountType=accounting&firmPlan=${p.id}`} className={p.recommended ? "btn btn-primary" : "btn btn-ghost"} style={{ width: "100%", justifyContent: "center" }}>Изберете {p.name}</Link>
            </div>
          );
        })}
      </div>

      <div className="glass panel" style={{ marginTop: 40, padding: "24px 28px", textAlign: "center" }}>
        <p style={{ fontSize: 14, color: "var(--ink-soft)", margin: "0 auto", maxWidth: 720, lineHeight: 1.6 }}>
          Нужен ви е по-голям обем или специфични интеграции за вашата счетоводна къща? <Link href="/contact" style={{ color: "var(--navy)", fontWeight: 600 }}>Свържете се с нас</Link> за индивидуално предложение.
        </p>
      </div>
    </div>
  );
}
