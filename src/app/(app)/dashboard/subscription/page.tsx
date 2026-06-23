import { requireCompany } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { FREE_PLAN_LIMIT, getYearMonth } from "@/lib/constants";

import { BANK_DETAILS, EUR_TO_BGN } from "@/lib/constants";

const PLANS = [
  { id: "free", name: "Безплатен", price: 0, docs: "5 документа/месец",
    features: ["5 фактури/месец", "Неограничени клиенти", "Склад", "Базов анализ"] },
  { id: "start", name: "Старт", price: 9, docs: "50 документа/месец",
    features: ["50 фактури/месец", "Повтарящи се фактури", "Разходи", "CRM бележки"] },
  { id: "business", name: "Бизнес", price: 29, docs: "300 документа/месец",
    features: ["300 фактури/месец", "Проекти", "Договори", "PDF отчет"], recommended: true },
  { id: "pro", name: "Про", price: 59, docs: "Неограничени",
    features: ["Неограничени фактури", "Активи", "Многофирмен достъп", "Приоритетна поддръжка"] },
].map((p) => ({ ...p, priceBGN: +(p.price * EUR_TO_BGN).toFixed(2) }));

export default async function SubscriptionPage() {
  const { companyId } = await requireCompany();

  const [subscription, counter] = await Promise.all([
    prisma.subscription.findUnique({ where: { companyId } }),
    prisma.usageCounter.findUnique({
      where: { companyId_yearMonth: { companyId, yearMonth: getYearMonth() } },
    }),
  ]);

  const currentPlan = subscription?.plan ?? "free";
  const docsUsed = counter?.documentsIssuedCount ?? 0;

  return (
    <>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 25, fontWeight: 600, margin: "0 0 3px" }}>Абонамент</h1>
        <div style={{ color: "var(--muted)", fontSize: 13 }}>Управление на плана и таксуването</div>
      </div>

      {/* Current plan status */}
      <div className="glass panel" style={{ marginBottom: 24, padding: "20px 24px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
          <div>
            <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 4 }}>ТЕКУЩ ПЛАН</div>
            <div style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 600 }}>
              {PLANS.find((p) => p.id === currentPlan)?.name ?? currentPlan}
            </div>
            {subscription?.currentPeriodEnd && (
              <div style={{ fontSize: 12.5, color: "var(--ink-soft)", marginTop: 4 }}>
                Следващо таксуване: {new Date(subscription.currentPeriodEnd).toLocaleDateString("bg-BG")}
              </div>
            )}
          </div>
          <div>
            <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 6 }}>Документи този месец</div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 140, height: 8, background: "var(--brass-soft)", borderRadius: 6, overflow: "hidden" }}>
                <div
                  style={{
                    height: "100%",
                    background: "var(--brass)",
                    width: currentPlan === "free"
                      ? `${Math.min(100, (docsUsed / FREE_PLAN_LIMIT) * 100)}%`
                      : `${Math.min(100, (docsUsed / (currentPlan === "start" ? 50 : currentPlan === "business" ? 200 : 500)) * 100)}%`,
                  }}
                />
              </div>
              <span className="num" style={{ fontSize: 13, color: "var(--muted)" }}>
                {docsUsed} / {currentPlan === "free" ? FREE_PLAN_LIMIT : currentPlan === "start" ? 50 : currentPlan === "business" ? 200 : "∞"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Plans grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
        {PLANS.map((plan) => (
          <div
            key={plan.id}
            className="glass panel"
            style={{
              padding: "24px 20px",
              position: "relative",
              border: plan.recommended ? "2px solid var(--brass)" : currentPlan === plan.id ? "2px solid var(--emerald)" : undefined,
            }}
          >
            {plan.recommended && <span className="ribbon">Препоръчан</span>}
            {currentPlan === plan.id && (
              <span
                style={{
                  position: "absolute",
                  top: -10,
                  left: 16,
                  background: "var(--emerald)",
                  color: "#fff",
                  fontSize: 10.5,
                  fontWeight: 600,
                  padding: "3px 10px",
                  borderRadius: 20,
                }}
              >
                Активен
              </span>
            )}

            <div style={{ fontFamily: "'Fraunces', serif", fontSize: 20, fontWeight: 600, marginBottom: 2 }}>
              {plan.name}
            </div>
            <div className="num" style={{ fontSize: 28, fontWeight: 700, margin: "10px 0 2px" }}>
              {plan.price === 0 ? "0" : plan.price}
              <span style={{ fontSize: 13, color: "var(--muted)", fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: 400 }}>
                {" "}{plan.price === 0 ? "безплатно" : "€/месец"}
              </span>
            </div>
            {plan.price > 0 && (
              <div className="num" style={{ fontSize: 11, color: "var(--muted)", marginBottom: 14 }}>
                ≈ {plan.priceBGN.toFixed(2)} лв/месец
              </div>
            )}

            <ul style={{ listStyle: "none", padding: 0, margin: "14px 0 20px", display: "flex", flexDirection: "column", gap: 8 }}>
              {plan.features.map((f) => (
                <li key={f} style={{ fontSize: 13, color: "var(--ink-soft)", paddingLeft: 18, position: "relative" }}>
                  <span style={{ position: "absolute", left: 0, color: "var(--emerald)", fontWeight: 700 }}>✓</span>
                  {f}
                </li>
              ))}
            </ul>

            {currentPlan === plan.id ? (
              <button className="btn btn-ghost" style={{ width: "100%", justifyContent: "center" }} disabled>
                Текущ план
              </button>
            ) : plan.price === 0 ? (
              <button className="btn btn-ghost" style={{ width: "100%", justifyContent: "center" }} disabled>
                Безплатен
              </button>
            ) : (
              <a href="#bank-transfer" className={plan.recommended ? "btn btn-primary" : "btn btn-ghost"} style={{ width: "100%", justifyContent: "center" }}>
                {currentPlan === "free" ? "Надгради" : "Смени план"}
              </a>
            )}
          </div>
        ))}
      </div>

      {/* Банков превод */}
      <div id="bank-transfer" className="glass panel" style={{ marginTop: 24, padding: "24px 28px", borderLeft: "4px solid var(--emerald)" }}>
        <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 18, margin: "0 0 6px" }}>💳 Плащане по банков път</h3>
        <p style={{ fontSize: 13, color: "var(--ink-soft)", margin: "0 0 16px", maxWidth: 680 }}>
          Към момента абонаментите се заплащат само по банков път. За да активирате избран план,
          преведете съответната сума по сметката по-долу. <strong>Скоро ще добавим и други методи на
          плащане (карта и др.), които ще бъдат налични директно в платформата.</strong> След като
          получим плащането, ще активираме плана ви и ще ви изпратим фактура за направеното плащане.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px,1fr))", gap: 14 }}>
          {[
            { label: "Получател", value: BANK_DETAILS.recipient },
            { label: "IBAN", value: BANK_DETAILS.iban },
            { label: "Банка", value: BANK_DETAILS.bank },
            { label: "Основание", value: BANK_DETAILS.reason },
          ].map((b) => (
            <div key={b.label} style={{ background: "rgba(255,255,255,.5)", borderRadius: 8, padding: "12px 14px", border: "1px solid var(--border)" }}>
              <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>{b.label}</div>
              <div className="num" style={{ fontSize: 14, fontWeight: 600 }}>{b.value}</div>
            </div>
          ))}
        </div>
      </div>

      <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 16, maxWidth: 640 }}>
        Всички цени са без ДДС. 1 EUR = {EUR_TO_BGN} лв. При смяна на план, промяната влиза в сила
        след потвърждаване на плащането. 14 дни безплатен тест на Бизнес и Про плановете.
      </p>
    </>
  );
}
