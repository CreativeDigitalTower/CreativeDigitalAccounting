"use client";

import { useState } from "react";
import Link from "next/link";
import { EUR_TO_BGN, isPromoActive, BILLING_PERIODS } from "@/lib/constants";
import { IconSeed, IconRocket, IconTrophy, IconCrown, IconBuilding } from "@/components/Icons";

type Plan = {
  id: string; Icon: typeof IconSeed; name: string; tagline: string; price: number; regularPrice: number;
  blurb: string; features: string[]; suited: string; recommended?: boolean; cta: string; href: string;
};

export const PLAN_DETAILS: Plan[] = [
  { id: "free", Icon: IconSeed, name: "Безплатен", tagline: "За стартиращи фирми и свободни професии", price: 0, regularPrice: 0,
    blurb: "Перфектен за първите стъпки на вашия бизнес.",
    features: ["До 5 документа месечно", "1 фирма", "1 потребител", "Фактури, проформи и оферти", "До 5 клиента и доставчика", "Базов склад", "Финансово табло", "Данъчен календар", "Двойно EUR/BGN обозначаване", "2 професионални PDF шаблона"],
    suited: "фрийлансъри, консултанти, новорегистрирани фирми.", cta: "Започни безплатно", href: "/register?plan=free" },
  { id: "start", Icon: IconRocket, name: "Старт", tagline: "За малки фирми с активна ежедневна работа", price: 9, regularPrice: 15,
    blurb: "Най-продаваният пакет за малки фирми.",
    features: ["Всичко от Безплатен", "До 30 документа месечно", "Разходи и входящи документи", "Повтарящи се фактури", "Автоматични напомняния", "Управление на разходите с прикачени файлове", "Стандартни бизнес анализи", "Симулация на приходи и складови цени", "Брандирани PDF документи (фирмено лого)", "Архив на документите", "3 професионални PDF шаблона", "1 потребител + 1 гост"],
    suited: "малки търговски фирми, агенции, онлайн магазини и услуги.", cta: "Изберете Старт", href: "/register?plan=start" },
  { id: "business", Icon: IconTrophy, name: "Бизнес", tagline: "За развиващи се компании", price: 29, regularPrice: 39,
    blurb: "Най-предпочитаният пакет от развиващи се компании.",
    features: ["Всичко от Старт", "До 300 документа месечно", "Управление на проекти (Project Management)", "HR портал за служители", "Заплати и осигуровки", "Онлайн молби за отпуск", "Одобрение на отпуски", "Възлагане и проследяване на задачи", "Пълен склад и наличности", "Производство и себестойност", "Договори", "Активи и амортизации", "HACCP технологична документация", "SAF-T генериране (месечно/годишно)", "Разширени анализи и KPI", "Над 100 шаблона за бизнес документи", "Пълен архив", "До 5 потребители", "Всички PDF шаблони"],
    suited: "растящи компании, производство, хранителна индустрия, по-сложни процеси.", recommended: true, cta: "Изберете Бизнес", href: "/register?plan=business" },
  { id: "pro", Icon: IconCrown, name: "Про", tagline: "За компании, които искат максимална автоматизация", price: 59, regularPrice: 79,
    blurb: "Най-мощната версия на Creative Digital Accounting.",
    features: ["Всичко от Бизнес", "Неограничени документи", "Неограничени потребители", "Неограничен брой фирми", "API интеграции", "AI CFO Assistant", "Персонализирани PDF шаблони", "Приоритетна поддръжка", "Ранен достъп до новите функции"],
    suited: "счетоводни кантори, групи фирми, производители, по-големи бизнеси.", cta: "Изберете Про", href: "/register?plan=pro" },
];

// Периодите се дефинират централно в constants; ре-експорт за обратна съвместимост.
export { BILLING_PERIODS };

export function Pricing() {
  const [period, setPeriod] = useState<(typeof BILLING_PERIODS)[number]>(BILLING_PERIODS[0]);
  const promo = isPromoActive();

  return (
    <section style={{ maxWidth: 1200, margin: "0 auto", padding: "0 32px 80px" }}>
      <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 36, fontWeight: 700, textAlign: "center", marginBottom: 8 }}>
        Абонаментни планове
      </h2>
      <p style={{ textAlign: "center", color: "var(--muted)", marginBottom: 20, fontSize: 14 }}>
        Всички цени са без ДДС · 1 EUR = {EUR_TO_BGN.toFixed(5)} лв
      </p>

      {/* Период на плащане */}
      <div style={{ display: "flex", justifyContent: "center", gap: 6, marginBottom: 8 }}>
        <div className="glass" style={{ display: "inline-flex", padding: 4, borderRadius: 24, gap: 2 }}>
          {BILLING_PERIODS.map((p) => (
            <button key={p.id} onClick={() => setPeriod(p)}
              style={{
                border: "none", cursor: "pointer", borderRadius: 20, padding: "8px 18px", fontSize: 13, fontWeight: 600,
                background: period.id === p.id ? "var(--emerald)" : "transparent",
                color: period.id === p.id ? "#fff" : "var(--ink-soft)",
              }}>
              {p.label}{p.discount > 0 && <span style={{ marginLeft: 6, fontSize: 11, color: period.id === p.id ? "#fff" : "var(--brass)" }}>−{p.discount * 100}%</span>}
            </button>
          ))}
        </div>
      </div>
      <p style={{ textAlign: "center", color: "var(--emerald)", fontSize: 12.5, fontWeight: 600, marginBottom: 28, minHeight: 18 }}>
        {period.discount > 0 ? `Спестявате ${period.discount * 100}% при плащане за ${period.label.toLowerCase()}` : " "}
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 16 }}>
        {PLAN_DETAILS.map((plan) => {
          const promoMonthly = plan.price * (1 - period.discount);
          const regularMonthly = plan.regularPrice * (1 - period.discount);
          const total = plan.price * period.months * (1 - period.discount);
          const fullTotal = plan.price * period.months;
          const Icon = plan.Icon;
          const hasPromo = promo && plan.regularPrice > plan.price;
          return (
            <div key={plan.id} className="glass panel"
              style={{ padding: "24px 20px", position: "relative", display: "flex", flexDirection: "column", border: plan.recommended ? "2px solid var(--brass)" : undefined }}>
              {plan.recommended && <span className="ribbon">Препоръчан</span>}
              {hasPromo && (
                <span style={{ position: "absolute", top: 12, left: 12, background: "var(--brick)", color: "#fff", fontSize: 10, fontWeight: 700, padding: "3px 9px", borderRadius: 20, letterSpacing: .3 }}>Специална цена</span>
              )}
              <div style={{ display: "flex", justifyContent: "center", marginBottom: 12, marginTop: hasPromo ? 12 : 0 }}>
                <div className="icon-tile" style={{ width: 56, height: 56 }}><Icon /></div>
              </div>
              <div style={{ fontFamily: "'Fraunces', serif", fontSize: 21, fontWeight: 700, textAlign: "center" }}>{plan.name}</div>
              <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 2, minHeight: 34, textAlign: "center" }}>{plan.tagline}</div>

              <div style={{ textAlign: "center", margin: "12px 0 0" }}>
                {hasPromo && (
                  <span className="num" style={{ fontSize: 15, color: "var(--muted)", textDecoration: "line-through", marginRight: 8 }}>
                    {regularMonthly.toFixed(regularMonthly % 1 === 0 ? 0 : 2)} €
                  </span>
                )}
                <span className="num" style={{ fontSize: 32, fontWeight: 700, color: hasPromo ? "var(--emerald-dark)" : "var(--ink)" }}>
                  {plan.price === 0 ? "0" : promoMonthly.toFixed(promoMonthly % 1 === 0 ? 0 : 2)}
                </span>
                <span style={{ fontSize: 14, color: "var(--muted)", fontWeight: 500 }}> € / месец</span>
              </div>
              {plan.price > 0 && period.months > 1 && (
                <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 2, textAlign: "center" }}>
                  {total.toFixed(2)} € общо за {period.months} м. <span style={{ color: "var(--brass)" }}>(−{(fullTotal - total).toFixed(2)} €)</span>
                </div>
              )}
              {plan.price > 0 && period.months === 1 && (
                <div className="num" style={{ fontSize: 11, color: "var(--muted)", marginBottom: 6, textAlign: "center" }}>≈ {(plan.price * EUR_TO_BGN).toFixed(2)} лв/месец</div>
              )}

              <p style={{ fontSize: 12.5, color: "var(--ink-soft)", margin: "10px 0 14px", lineHeight: 1.5, textAlign: "center" }}>{plan.blurb}</p>

              <ul style={{ listStyle: "none", padding: 0, margin: "0 0 16px", display: "flex", flexDirection: "column", gap: 7, flex: 1 }}>
                {plan.features.map((f) => (
                  <li key={f} style={{ fontSize: 12.5, color: "var(--ink-soft)", paddingLeft: 18, position: "relative" }}>
                    <span style={{ position: "absolute", left: 0, color: "var(--emerald)", fontWeight: 700 }}>✓</span>{f}
                  </li>
                ))}
              </ul>

              <div style={{ fontSize: 11.5, color: "var(--muted)", marginBottom: 14, fontStyle: "italic" }}>Подходящ за: {plan.suited}</div>
              <Link href={`${plan.href}&period=${period.id}`} className={plan.recommended ? "btn btn-primary" : "btn btn-ghost"} style={{ width: "100%", justifyContent: "center" }}>{plan.cta}</Link>
            </div>
          );
        })}
      </div>

      {/* Специално предложение */}
      {promo && (
        <div className="glass panel" style={{ marginTop: 18, padding: "16px 24px", textAlign: "center", borderLeft: "4px solid var(--brick)", background: "var(--brick-soft)" }}>
          <strong style={{ color: "var(--brick)", fontSize: 15 }}>Спестете до 20 € всеки месец.</strong>{" "}
          <span style={{ fontSize: 13.5, color: "var(--ink-soft)" }}>
            Регистрирайте се до 31.12.2026 г. и се възползвайте от специалните стартови цени на Creative Digital Accounting.
          </span>
        </div>
      )}

      {/* Корпоративни */}
      <div className="glass panel" style={{ marginTop: 18, padding: "24px 28px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20, flexWrap: "wrap", borderLeft: "4px solid var(--navy)" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <span style={{ color: "var(--navy)" }}><IconBuilding /></span>
            <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 20, margin: 0 }}>Корпоративни</h3>
          </div>
          <p style={{ margin: 0, color: "var(--ink-soft)", fontSize: 13.5, maxWidth: 620 }}>
            Индивидуални предложения с изработка на специфични софтуерни решения, създадени точно за нуждите на вашата фирма — интеграции, персонализирани модули и специализирана поддръжка.
          </p>
        </div>
        <Link href="/contact" className="btn btn-primary" style={{ flexShrink: 0 }}>Свържете се с нас</Link>
      </div>

      <div style={{ marginTop: 24, textAlign: "center", display: "flex", flexDirection: "column", gap: 8 }}>
        <p style={{ fontSize: 13.5, color: "var(--ink-soft)", margin: 0 }}>
          <strong>7 дни безплатен тест</strong> (еднократно) на плановете Старт и Бизнес.
        </p>
        <p style={{ fontSize: 13, color: "var(--emerald)", margin: 0, fontWeight: 600 }}>
          Автоматично преминаване към еврото и пълна готовност за въвеждането на EUR в България
        </p>
      </div>
    </section>
  );
}
