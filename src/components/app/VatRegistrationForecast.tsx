import { formatCurrency } from "@/lib/constants";

/**
 * Ориентировъчна прогноза за задължителна регистрация по ДДС за НЕрегистрирани фирми.
 * На база облагаемия оборот за последните 12 месеца и прогнозния месечен темп.
 * Прагът е по актуалните изисквания на ЗДДС (към 2025 г.: 166 000 лв. за 12 месеца).
 */
export function VatRegistrationForecast({ registered, turnover, threshold, monthlyRunRate, thresholdBgn }: {
  registered: boolean; turnover: number; threshold: number; monthlyRunRate: number; thresholdBgn: number;
}) {
  if (registered) return null; // регистрираните по ДДС не се нуждаят от прогнозата

  const pct = threshold > 0 ? Math.min(100, (turnover / threshold) * 100) : 0;
  const remaining = Math.max(0, threshold - turnover);
  const reached = turnover >= threshold;

  let forecastLabel: string;
  if (reached) {
    forecastLabel = "Оборотът вече надхвърля прага — възниква задължение за регистрация по ДДС.";
  } else if (monthlyRunRate <= 0) {
    forecastLabel = "Недостатъчно данни за прогноза (въведете месечни абонаменти или издайте фактури).";
  } else {
    const monthsLeft = Math.ceil(remaining / monthlyRunRate);
    const d = new Date();
    d.setMonth(d.getMonth() + monthsLeft);
    forecastLabel = monthsLeft > 60
      ? "При текущия темп прагът не се очаква да бъде достигнат в близките 5 години."
      : `При текущия темп прагът се очаква да бъде достигнат след ~${monthsLeft} ${monthsLeft === 1 ? "месец" : "месеца"} (около ${d.toLocaleDateString("bg-BG", { month: "long", year: "numeric" })}).`;
  }

  const barColor = reached ? "var(--brick)" : pct >= 80 ? "var(--brass)" : "var(--emerald)";

  return (
    <div className="glass panel" style={{ borderLeft: `4px solid ${barColor}` }}>
      <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 15, margin: "0 0 4px" }}>Прогноза: регистрация по ДДС</h3>
      <p style={{ fontSize: 12, color: "var(--muted)", margin: "0 0 14px" }}>
        Фирмата не е регистрирана по ДДС. Прагът за <strong>задължителна</strong> регистрация е <strong>{thresholdBgn.toLocaleString("bg-BG")} лв.</strong> облагаем оборот за последните 12 месеца (≈ {formatCurrency(threshold)}), по актуалните изисквания на ЗДДС.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px,1fr))", gap: 14, marginBottom: 14 }}>
        <div><div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 4 }}>Оборот (последни 12 м.)</div><div className="num" style={{ fontSize: 20, fontWeight: 700, color: "var(--navy)" }}>{formatCurrency(turnover)}</div></div>
        <div><div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 4 }}>Достигнато от прага</div><div className="num" style={{ fontSize: 20, fontWeight: 700, color: barColor }}>{pct.toFixed(1)}%</div></div>
        <div><div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 4 }}>Остават до прага</div><div className="num" style={{ fontSize: 20, fontWeight: 700, color: "var(--brass)" }}>{formatCurrency(remaining)}</div></div>
      </div>

      <div style={{ height: 10, background: "rgba(217,215,200,.5)", borderRadius: 5, overflow: "hidden", marginBottom: 10 }}>
        <div style={{ width: `${pct}%`, height: "100%", background: barColor, borderRadius: 5, transition: "width .5s" }} />
      </div>

      <div style={{ fontSize: 12.5, color: reached ? "var(--brick)" : "var(--ink-soft)", fontWeight: reached ? 700 : 400 }}>{forecastLabel}</div>
      <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 8 }}>
        Прогнозата е ориентировъчна, на база текущия оборот и очаквани приходи от абонаменти. За точна преценка се консултирайте със счетоводител.
      </div>
    </div>
  );
}
