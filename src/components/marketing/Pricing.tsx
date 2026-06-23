import Link from "next/link";
import { EUR_TO_BGN } from "@/lib/constants";

export const PLAN_DETAILS = [
  {
    id: "free",
    emoji: "🟢",
    name: "Безплатен",
    tagline: "За стартиращи фирми и свободни професии",
    price: 0,
    blurb: "Перфектен за първите стъпки на вашия бизнес.",
    features: [
      "До 5 документа месечно",
      "Издаване на фактури и проформи",
      "Неограничен брой клиенти и доставчици",
      "Управление на складови наличности",
      "Основно финансово табло",
      "Двойно обозначаване EUR/BGN",
      "1 потребител",
      "1 фирма",
    ],
    suited: "фрийлансъри, консултанти, новорегистрирани фирми.",
    cta: "Започни безплатно",
    href: "/register?plan=free",
  },
  {
    id: "start",
    emoji: "🚀",
    name: "Старт",
    tagline: "За малки фирми с активна ежедневна работа",
    price: 9,
    blurb: "Всичко необходимо за професионално управление на бизнеса в една система.",
    features: [
      "До 50 документа месечно",
      "Всички функции от Безплатен план",
      "Разходи и входящи документи",
      "Повтарящи се фактури",
      "История на плащанията",
      "Клиенти и доставчици с досиета",
      "Напомняния за плащания",
      "Склад и наличности",
      "Автоматична номерация на документи",
      "Експорт в PDF",
    ],
    suited: "малки търговски фирми, агенции, онлайн магазини и услуги.",
    cta: "Изберете Старт",
    href: "/register?plan=start",
  },
  {
    id: "business",
    emoji: "🏆",
    name: "Бизнес",
    tagline: "За развиващи се компании",
    price: 29,
    blurb: "Пълен контрол върху проектите, договорите и финансовите резултати.",
    features: [
      "До 300 документа месечно",
      "Всички функции от Старт план",
      "Управление на проекти",
      "Управление на договори",
      "Финансови анализи и KPI табло",
      "Паричен поток и печалба по проекти",
      "Автоматизирани известия и напомняния",
      "Финансови PDF отчети",
      "Архив на документи и активи",
      "Потребителски роли и права",
    ],
    suited: "растящи компании с няколко служители и по-сложни процеси.",
    recommended: true,
    cta: "Изберете Бизнес",
    href: "/register?plan=business",
  },
  {
    id: "pro",
    emoji: "👑",
    name: "Про",
    tagline: "За компании, които искат максимална автоматизация",
    price: 59,
    blurb: "Най-мощната версия на Creative Digital Accounting.",
    features: [
      "Неограничен брой документи",
      "Всички функции от Бизнес план",
      "Неограничени потребители",
      "Многофирмено управление",
      "AI CFO Assistant",
      "Интелигентни финансови прогнози",
      "API достъп за интеграции",
      "Разширени справки и анализи",
      "Приоритетна поддръжка",
      "Ранен достъп до нови функционалности",
    ],
    suited: "групи компании, счетоводни кантори, производствени фирми и бързо растящ бизнес.",
    cta: "Изберете Про",
    href: "/register?plan=pro",
  },
] as Array<{
  id: string; emoji: string; name: string; tagline: string; price: number;
  blurb: string; features: string[]; suited: string; recommended?: boolean;
  cta: string; href: string;
}>;

export function Pricing() {
  return (
    <section style={{ maxWidth: 1200, margin: "0 auto", padding: "0 32px 80px" }}>
      <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 36, fontWeight: 700, textAlign: "center", marginBottom: 8 }}>
        Абонаментни планове
      </h2>
      <p style={{ textAlign: "center", color: "var(--muted)", marginBottom: 40, fontSize: 14 }}>
        Всички цени са без ДДС · 1 EUR = {EUR_TO_BGN.toFixed(5)} лв
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 16 }}>
        {PLAN_DETAILS.map((plan) => (
          <div
            key={plan.id}
            className="glass panel"
            style={{
              padding: "24px 20px",
              position: "relative",
              display: "flex",
              flexDirection: "column",
              border: plan.recommended ? "2px solid var(--brass)" : undefined,
            }}
          >
            {plan.recommended && <span className="ribbon">⭐ Препоръчан</span>}
            <div style={{ fontSize: 22, marginBottom: 4 }}>{plan.emoji}</div>
            <div style={{ fontFamily: "'Fraunces', serif", fontSize: 21, fontWeight: 600 }}>{plan.name}</div>
            <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 2, minHeight: 34 }}>{plan.tagline}</div>

            <div className="num" style={{ fontSize: 32, fontWeight: 700, margin: "12px 0 0" }}>
              {plan.price}
              <span style={{ fontSize: 14, color: "var(--muted)", fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: 500 }}> € / месец</span>
            </div>
            {plan.price > 0 && (
              <div className="num" style={{ fontSize: 11, color: "var(--muted)", marginBottom: 6 }}>
                ≈ {(plan.price * EUR_TO_BGN).toFixed(2)} лв/месец
              </div>
            )}
            <p style={{ fontSize: 12.5, color: "var(--ink-soft)", margin: "8px 0 14px", lineHeight: 1.5 }}>{plan.blurb}</p>

            <ul style={{ listStyle: "none", padding: 0, margin: "0 0 16px", display: "flex", flexDirection: "column", gap: 7, flex: 1 }}>
              {plan.features.map((f) => (
                <li key={f} style={{ fontSize: 12.5, color: "var(--ink-soft)", paddingLeft: 18, position: "relative" }}>
                  <span style={{ position: "absolute", left: 0, color: "var(--emerald)", fontWeight: 700 }}>✔</span>
                  {f}
                </li>
              ))}
            </ul>

            <div style={{ fontSize: 11.5, color: "var(--muted)", marginBottom: 14, fontStyle: "italic" }}>
              Подходящ за: {plan.suited}
            </div>

            <Link href={plan.href} className={plan.recommended ? "btn btn-primary" : "btn btn-ghost"} style={{ width: "100%", justifyContent: "center" }}>
              {plan.cta}
            </Link>
          </div>
        ))}
      </div>

      {/* Корпоративни */}
      <div className="glass panel" style={{ marginTop: 18, padding: "24px 28px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20, flexWrap: "wrap", borderLeft: "4px solid var(--navy)" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 20 }}>🏢</span>
            <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 20, margin: 0 }}>Корпоративни</h3>
          </div>
          <p style={{ margin: 0, color: "var(--ink-soft)", fontSize: 13.5, maxWidth: 620 }}>
            Индивидуални предложения с изработка на специфични софтуерни решения,
            създадени точно за нуждите на вашата фирма — интеграции, персонализирани модули и
            специализирана поддръжка.
          </p>
        </div>
        <Link href="/contact" className="btn btn-primary" style={{ flexShrink: 0 }}>
          Свържете се с нас
        </Link>
      </div>

      {/* Trial + EUR readiness */}
      <div style={{ marginTop: 24, textAlign: "center", display: "flex", flexDirection: "column", gap: 8 }}>
        <p style={{ fontSize: 13.5, color: "var(--ink-soft)", margin: 0 }}>
          🎁 <strong>14 дни безплатен тест</strong> на Бизнес и Про плановете. Без банкова карта.
        </p>
        <p style={{ fontSize: 13, color: "var(--emerald)", margin: 0, fontWeight: 600 }}>
          ✔ Автоматично преминаване към еврото и пълна готовност за въвеждането на EUR в България
        </p>
      </div>
    </section>
  );
}
