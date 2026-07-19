import { formatCurrency } from "@/lib/constants";
import { getT } from "@/lib/i18n/server";

/**
 * Ориентировъчна прогноза за задължителна регистрация по ДДС за НЕрегистрирани фирми.
 *
 * Актуален режим (2026):
 *  - Праг: 51 130 EUR облагаем оборот (≈ 100 000 лв.).
 *  - Оборотът се следи за КАЛЕНДАРНАТА година (1 януари – 31 декември), ежедневно
 *    (а не за плаващ 12-месечен период).
 *  - Заявление за регистрация се подава в 7-дневен срок от деня на надвишаване на прага.
 *  - В оборота по новата дефиниция (чл. 168в) влизат и съпътстващи доставки, които
 *    по стария ред може да са били изключвани.
 */
export async function VatRegistrationForecast({ registered, turnover, threshold, thresholdBgn, monthlyRunRate, year }: {
  registered: boolean; turnover: number; threshold: number; thresholdBgn: number; monthlyRunRate: number; year: number;
}) {
  if (registered) return null;
  const { t, locale } = await getT();

  const pct = threshold > 0 ? Math.min(100, (turnover / threshold) * 100) : 0;
  const remaining = Math.max(0, threshold - turnover);
  const reached = turnover >= threshold;
  const yearEnd = new Date(year, 11, 31);

  let forecastLabel: string;
  if (reached) {
    forecastLabel = t("simulators.vat.reached");
  } else if (monthlyRunRate <= 0) {
    forecastLabel = t("simulators.vat.noData");
  } else {
    const monthsLeft = remaining / monthlyRunRate;
    const d = new Date();
    d.setMonth(d.getMonth() + Math.ceil(monthsLeft));
    if (d > yearEnd) {
      forecastLabel = t("simulators.vat.notReachedByYear", { year });
    } else {
      forecastLabel = t("simulators.vat.expectedAround", { date: d.toLocaleDateString(locale, { month: "long", year: "numeric" }) });
    }
  }

  const barColor = reached ? "var(--brick)" : pct >= 80 ? "var(--brass)" : "var(--emerald)";

  return (
    <div className="glass panel" style={{ borderLeft: `4px solid ${barColor}` }}>
      <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 15, margin: "0 0 4px" }}>{t("simulators.vat.title")}</h3>
      <p style={{ fontSize: 12, color: "var(--muted)", margin: "0 0 14px" }} dangerouslySetInnerHTML={{ __html: t("simulators.vat.intro", { threshold: formatCurrency(threshold), thresholdBgn: thresholdBgn.toLocaleString(locale), year }) }} />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px,1fr))", gap: 14, marginBottom: 14 }}>
        <div><div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 4 }}>{t("simulators.vat.turnoverYear", { year })}</div><div className="num" style={{ fontSize: 20, fontWeight: 700, color: "var(--navy)" }}>{formatCurrency(turnover)}</div></div>
        <div><div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 4 }}>{t("simulators.vat.reachedPct")}</div><div className="num" style={{ fontSize: 20, fontWeight: 700, color: barColor }}>{pct.toFixed(1)}%</div></div>
        <div><div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 4 }}>{t("simulators.vat.remaining")}</div><div className="num" style={{ fontSize: 20, fontWeight: 700, color: "var(--brass)" }}>{formatCurrency(remaining)}</div></div>
      </div>

      <div style={{ height: 10, background: "rgba(217,215,200,.5)", borderRadius: 5, overflow: "hidden", marginBottom: 10 }}>
        <div style={{ width: `${pct}%`, height: "100%", background: barColor, borderRadius: 5, transition: "width .6s cubic-bezier(.22,1,.36,1)" }} />
      </div>

      <div style={{ fontSize: 12.5, color: reached ? "var(--brick)" : "var(--ink-soft)", fontWeight: reached ? 700 : 400 }}>{forecastLabel}</div>
      <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 8 }}>
        {t("simulators.vat.note")}
      </div>
    </div>
  );
}
