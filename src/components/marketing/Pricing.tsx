"use client";

import { useState } from "react";
import Link from "next/link";
import { SUBSCRIPTION_PLANS, BILLING_PERIODS, periodTotalEuros, effectivePeriodEuros, effectiveMonthlyEquivalentEuros, blackFridayActive, blackFridayDiscountPercent, blackFridaySavingsEuros, type PlanId } from "@/lib/constants";
import { IconSeed, IconRocket, IconTrophy, IconCrown, IconBuilding } from "@/components/Icons";
import { useI18n } from "@/components/i18n/I18nProvider";

type Plan = {
  id: string; Icon: typeof IconSeed; name: string; tagline: string; price: number; regularPrice: number;
  blurb: string; features: string[]; suited: string; recommended?: boolean; cta: string; href: string;
};

// Цените идват ЕДИНСТВЕНО от централния източник SUBSCRIPTION_PLANS (§8.2/§17) —
// без паралелна ценова конфигурация. Тук остават само презентационни данни (икона,
// секции), а текстът на функциите се поема от i18n (`pricing.plans.*`).
const pr = (id: PlanId) => ({ price: SUBSCRIPTION_PLANS[id].price, regularPrice: SUBSCRIPTION_PLANS[id].regularPrice });

export const PLAN_DETAILS: Plan[] = [
  { id: "free", Icon: IconSeed, name: "Безплатен", tagline: "За стартиращи фирми и свободни професии", ...pr("free"),
    blurb: "Перфектен за първите стъпки на вашия бизнес.",
    features: ["До 5 документа месечно", "1 фирма", "1 потребител", "Фактури, проформи и оферти", "До 5 клиента и доставчика", "Базов склад", "Финансово табло", "Данъчен календар", "Двойно EUR/BGN обозначаване", "2 професионални PDF шаблона"],
    suited: "фрийлансъри, консултанти, новорегистрирани фирми.", cta: "Започни безплатно", href: "/register?plan=free" },
  { id: "start", Icon: IconRocket, name: "Старт", tagline: "За малки фирми с активна ежедневна работа", ...pr("start"),
    blurb: "Най-продаваният пакет за малки фирми.",
    features: ["Всичко от Безплатен", "До 30 документа месечно", "Разходи и входящи документи", "Повтарящи се фактури", "Автоматични напомняния", "Управление на разходите с прикачени файлове", "Стандартни бизнес анализи", "Симулация на приходи и складови цени", "Брандирани PDF документи (фирмено лого)", "Архив на документите", "3 професионални PDF шаблона", "1 потребител + 1 гост"],
    suited: "малки търговски фирми, агенции, онлайн магазини и услуги.", cta: "Изберете Старт", href: "/register?plan=start" },
  { id: "business", Icon: IconTrophy, name: "Бизнес", tagline: "За развиващи се компании", ...pr("business"),
    blurb: "Най-предпочитаният пакет от развиващи се компании.",
    features: ["Всичко от Старт", "До 300 документа месечно", "Управление на проекти (Project Management)", "HR портал за служители", "Заплати и осигуровки", "Онлайн молби за отпуск", "Одобрение на отпуски", "Възлагане и проследяване на задачи", "Пълен склад и наличности", "Производство и себестойност", "Договори", "Активи и амортизации", "HACCP технологична документация", "SAF-T генериране (месечно/годишно)", "Разширени анализи и KPI", "Над 100 шаблона за бизнес документи", "Пълен архив", "До 5 потребители", "Всички PDF шаблони"],
    suited: "растящи компании, производство, хранителна индустрия, по-сложни процеси.", recommended: true, cta: "Изберете Бизнес", href: "/register?plan=business" },
  { id: "pro", Icon: IconCrown, name: "Про", tagline: "За компании, които искат максимална автоматизация", ...pr("pro"),
    blurb: "Най-мощната версия на Creative Digital Accounting.",
    features: ["Всичко от Бизнес", "Неограничени документи", "Неограничени потребители", "Неограничен брой фирми", "API интеграции", "AI CFO Assistant", "Персонализирани PDF шаблони", "Приоритетна поддръжка", "Ранен достъп до новите функции"],
    suited: "счетоводни кантори, групи фирми, производители, по-големи бизнеси.", cta: "Изберете Про", href: "/register?plan=pro" },
];

// Периодите се дефинират централно в constants; ре-експорт за обратна съвместимост.
export { BILLING_PERIODS };

export function Pricing() {
  const { t, messages } = useI18n();
  const P = (messages as unknown as { pricing: { plans: Record<string, { name: string; tagline: string; blurb: string; suited: string; cta: string; features: string[] }> } }).pricing;
  const [period, setPeriod] = useState<(typeof BILLING_PERIODS)[number]>(BILLING_PERIODS[0]);
  const bfActive = blackFridayActive();

  return (
    <section id="pricing" style={{ maxWidth: 1200, margin: "0 auto", padding: "0 32px 80px", scrollMarginTop: 80 }}>
      <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 36, fontWeight: 700, textAlign: "center", marginBottom: 8 }}>
        {t("pricing.title")}
      </h2>
      <p style={{ textAlign: "center", color: "var(--muted)", marginBottom: 20, fontSize: 14 }}>
        {t("pricing.pricesNote")}
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
              {t(`pricing.periods.${p.id}`)}{p.discount > 0 && <span style={{ marginLeft: 6, fontSize: 11, color: period.id === p.id ? "#fff" : "var(--brass)" }}>−{p.discount * 100}%</span>}
            </button>
          ))}
        </div>
      </div>
      <p style={{ textAlign: "center", color: bfActive && period.id === "annual" ? "var(--brick)" : "var(--emerald)", fontSize: 12.5, fontWeight: 600, marginBottom: bfActive ? 6 : 28, minHeight: 18 }}>
        {bfActive
          ? (period.id === "annual" ? `🖤 ${t("pricing.bf.bestOffer")}` : t("pricing.bf.tagline"))
          : (period.discount > 0 ? t("pricing.saveNote", { pct: period.discount * 100, period: t(`pricing.periods.${period.id}`).toLowerCase() }) : " ")}
      </p>
      {bfActive && <p style={{ textAlign: "center", color: "var(--muted)", fontSize: 12, fontWeight: 500, marginBottom: 24 }}>{t("pricing.bf.annualPitch")} · {t("pricing.bf.endsNote")}</p>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 16 }}>
        {PLAN_DETAILS.map((plan) => {
          // Всички суми от централния източник (целочислени центове) — съвпадат с плащането (§3.4/§10).
          const pid = plan.id as PlanId;
          const regularTotal = periodTotalEuros(pid, period.id);
          const effTotal = effectivePeriodEuros(pid, period.id);
          const monthlyEq = effectiveMonthlyEquivalentEuros(pid, period.id);
          const bfPct = blackFridayDiscountPercent(pid, period.id);
          const savings = blackFridaySavingsEuros(pid, period.id);
          const isBf = bfActive && bfPct > 0 && plan.price > 0;
          const Icon = plan.Icon;
          const pt = P.plans[plan.id];
          return (
            <div key={plan.id} className="glass panel"
              style={{ padding: "24px 20px", position: "relative", display: "flex", flexDirection: "column", border: plan.recommended ? "2px solid var(--brass)" : undefined }}>
              {plan.recommended && <span className="ribbon">{t("pricing.recommended")}</span>}
              {isBf && (
                <span style={{ position: "absolute", top: 12, left: 12, background: "#111111", color: "#fff", fontSize: 10, fontWeight: 700, padding: "3px 9px", borderRadius: 20, letterSpacing: .3 }}>🖤 {t("pricing.bf.badge", { pct: bfPct })}</span>
              )}
              <div style={{ display: "flex", justifyContent: "center", marginBottom: 12, marginTop: isBf ? 12 : 0 }}>
                <div className="icon-tile" style={{ width: 56, height: 56 }}><Icon /></div>
              </div>
              <div style={{ fontFamily: "'Fraunces', serif", fontSize: 21, fontWeight: 700, textAlign: "center" }}>{pt.name}</div>
              <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 2, minHeight: 34, textAlign: "center" }}>{pt.tagline}</div>

              <div style={{ textAlign: "center", margin: "12px 0 0" }}>
                {isBf && (
                  <span className="num" style={{ fontSize: 15, color: "var(--muted)", textDecoration: "line-through", marginRight: 8 }}>
                    {regularTotal.toFixed(2)} €
                  </span>
                )}
                <span className="num" style={{ fontSize: 32, fontWeight: 700, color: isBf ? "var(--emerald-dark)" : "var(--ink)" }}>
                  {plan.price === 0 ? "0" : (period.months > 1 ? effTotal : monthlyEq).toFixed(2)}
                </span>
                <span style={{ fontSize: 14, color: "var(--muted)", fontWeight: 500 }}> {period.months > 1 ? t(`pricing.periods.${period.id}`).toLowerCase() : t("pricing.perMonth")}</span>
              </div>
              {plan.price > 0 && period.months > 1 && (
                <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 2, textAlign: "center" }}>
                  {t("pricing.sub.monthlyEquiv", { amount: monthlyEq.toFixed(2) })}
                  {isBf
                    ? <span style={{ color: "var(--brick)", fontWeight: 600 }}> · {t("pricing.bf.save", { amount: savings.toFixed(2) })}</span>
                    : <span style={{ color: "var(--brass)" }}> · {t("pricing.saved", { amount: (periodTotalEuros(pid, "monthly") * period.months - regularTotal).toFixed(2) })}</span>}
                </div>
              )}
              <p style={{ fontSize: 12.5, color: "var(--ink-soft)", margin: "10px 0 14px", lineHeight: 1.5, textAlign: "center" }}>{pt.blurb}</p>

              <ul style={{ listStyle: "none", padding: 0, margin: "0 0 16px", display: "flex", flexDirection: "column", gap: 7, flex: 1 }}>
                {pt.features.map((f: string) => (
                  <li key={f} style={{ fontSize: 12.5, color: "var(--ink-soft)", paddingLeft: 18, position: "relative" }}>
                    <span style={{ position: "absolute", left: 0, color: "var(--emerald)", fontWeight: 700 }}>✓</span>{f}
                  </li>
                ))}
              </ul>

              <div style={{ fontSize: 11.5, color: "var(--muted)", marginBottom: 14, fontStyle: "italic" }}>{t("pricing.suitedFor", { text: pt.suited })}</div>
              <Link href={`${plan.href}&period=${period.id}`} className={plan.recommended ? "btn btn-primary" : "btn btn-ghost"} style={{ width: "100%", justifyContent: "center" }}>{pt.cta}</Link>
            </div>
          );
        })}
      </div>

      {/* Black Friday — промоционално каре (скрива се автоматично след края на кампанията) */}
      {bfActive && (
        <div className="panel" style={{ marginTop: 18, padding: "16px 24px", textAlign: "center", borderRadius: 14, background: "#111111", color: "#fff" }}>
          <strong style={{ fontSize: 15 }}>🖤 {t("pricing.bf.calloutStrong")}</strong>{" "}
          <span style={{ fontSize: 13.5, color: "rgba(255,255,255,.82)" }}>
            {t("pricing.bf.calloutText")}
          </span>
        </div>
      )}

      {/* Корпоративни */}
      <div className="glass panel" style={{ marginTop: 18, padding: "24px 28px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20, flexWrap: "wrap", borderLeft: "4px solid var(--navy)" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <span style={{ color: "var(--navy)" }}><IconBuilding /></span>
            <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 20, margin: 0 }}>{t("pricing.corpTitle")}</h3>
          </div>
          <p style={{ margin: 0, color: "var(--ink-soft)", fontSize: 13.5, maxWidth: 620 }}>
            {t("pricing.corpText")}
          </p>
        </div>
        <Link href="/contact" className="btn btn-primary" style={{ flexShrink: 0 }}>{t("pricing.corpCta")}</Link>
      </div>

      <div style={{ marginTop: 24, textAlign: "center" }}>
        <p style={{ fontSize: 13.5, color: "var(--ink-soft)", margin: 0 }}>
          <strong>{t("pricing.trialBold")}</strong>{t("pricing.trialRest")}
        </p>
      </div>
    </section>
  );
}
