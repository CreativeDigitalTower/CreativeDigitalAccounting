import { formatCurrency } from "@/lib/constants";

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
export function VatRegistrationForecast({ registered, turnover, threshold, thresholdBgn, monthlyRunRate, year }: {
  registered: boolean; turnover: number; threshold: number; thresholdBgn: number; monthlyRunRate: number; year: number;
}) {
  if (registered) return null;

  const pct = threshold > 0 ? Math.min(100, (turnover / threshold) * 100) : 0;
  const remaining = Math.max(0, threshold - turnover);
  const reached = turnover >= threshold;
  const yearEnd = new Date(year, 11, 31);

  let forecastLabel: string;
  if (reached) {
    forecastLabel = "Оборотът за годината вече надхвърля прага — възниква задължение за регистрация по ДДС (заявление в 7-дневен срок от деня на надвишаването).";
  } else if (monthlyRunRate <= 0) {
    forecastLabel = "Недостатъчно данни за прогноза (въведете месечни приходи или издайте фактури).";
  } else {
    const monthsLeft = remaining / monthlyRunRate;
    const d = new Date();
    d.setMonth(d.getMonth() + Math.ceil(monthsLeft));
    if (d > yearEnd) {
      forecastLabel = `При текущия темп прагът най-вероятно НЯМА да бъде достигнат до края на ${year} г. (оборотът се нулира на 1 януари).`;
    } else {
      forecastLabel = `При текущия темп прагът се очаква да бъде достигнат около ${d.toLocaleDateString("bg-BG", { month: "long", year: "numeric" })}. Тогава заявление се подава в 7-дневен срок.`;
    }
  }

  const barColor = reached ? "var(--brick)" : pct >= 80 ? "var(--brass)" : "var(--emerald)";

  return (
    <div className="glass panel" style={{ borderLeft: `4px solid ${barColor}` }}>
      <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 15, margin: "0 0 4px" }}>Прогноза: регистрация по ДДС</h3>
      <p style={{ fontSize: 12, color: "var(--muted)", margin: "0 0 14px" }}>
        Фирмата не е регистрирана по ДДС. Прагът за <strong>задължителна</strong> регистрация е <strong>{formatCurrency(threshold)}</strong> (≈ {thresholdBgn.toLocaleString("bg-BG")} лв.) облагаем оборот за <strong>календарната {year} г.</strong>, проследяван ежедневно (чл. 168в от ЗДДС).
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px,1fr))", gap: 14, marginBottom: 14 }}>
        <div><div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 4 }}>Оборот за {year} г.</div><div className="num" style={{ fontSize: 20, fontWeight: 700, color: "var(--navy)" }}>{formatCurrency(turnover)}</div></div>
        <div><div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 4 }}>Достигнато от прага</div><div className="num" style={{ fontSize: 20, fontWeight: 700, color: barColor }}>{pct.toFixed(1)}%</div></div>
        <div><div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 4 }}>Остават до прага</div><div className="num" style={{ fontSize: 20, fontWeight: 700, color: "var(--brass)" }}>{formatCurrency(remaining)}</div></div>
      </div>

      <div style={{ height: 10, background: "rgba(217,215,200,.5)", borderRadius: 5, overflow: "hidden", marginBottom: 10 }}>
        <div style={{ width: `${pct}%`, height: "100%", background: barColor, borderRadius: 5, transition: "width .6s cubic-bezier(.22,1,.36,1)" }} />
      </div>

      <div style={{ fontSize: 12.5, color: reached ? "var(--brick)" : "var(--ink-soft)", fontWeight: reached ? 700 : 400 }}>{forecastLabel}</div>
      <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 8 }}>
        Прогнозата е ориентировъчна, на база приходите за годината и очаквания темп. В оборота по чл. 168в влизат и някои съпътстващи доставки — за точна преценка се консултирайте със счетоводител.
      </div>
    </div>
  );
}
