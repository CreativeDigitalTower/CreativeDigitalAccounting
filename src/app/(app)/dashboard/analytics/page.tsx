import { requireFeature } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { FinancialHistoryForm } from "@/components/app/FinancialHistoryForm";
import { TopClientsChart } from "@/components/app/TopClientsChart";
import { MonthlyBarChart } from "@/components/app/MonthlyBarChart";
import { aggregateClientRevenue } from "@/lib/clientRevenue";
import { formatCurrency, toBGN, isDualCurrencyActive } from "@/lib/constants";

export default async function AnalyticsPage() {
  const { companyId } = await requireFeature("analytics");
  const dual = isDualCurrencyActive();
  const now = new Date();
  const year = now.getFullYear();
  const yearStart = new Date(year, 0, 1);

  const [invoices, expenses, goal, financialHistory, overdueCount, paidCount] = await Promise.all([
    prisma.document.findMany({
      where: { companyId, type: "invoice", issueDate: { gte: yearStart } },
      include: { lines: true, client: { select: { name: true } } },
    }),
    prisma.expense.aggregate({
      where: { companyId, date: { gte: yearStart } },
      _sum: { amount: true },
    }),
    prisma.financialGoal.findUnique({ where: { companyId_year: { companyId, year } } }),
    prisma.financialHistory.findMany({
      where: { companyId },
      orderBy: { year: "asc" },
    }),
    prisma.document.count({ where: { companyId, type: "invoice", status: "overdue" } }),
    prisma.document.count({ where: { companyId, type: "invoice", status: "paid" } }),
  ]);

  // Очаквани месечни приходи (абонаментни договори) + фиксирани месечни разходи
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const [retainerAgg, recurringExpenses, monthInvoices] = await Promise.all([
    prisma.client.aggregate({ where: { companyId, monthlyRetainer: { not: null } }, _sum: { monthlyRetainer: true } }),
    prisma.expense.findMany({ where: { companyId, isRecurring: true }, include: { category: true } }),
    prisma.document.findMany({ where: { companyId, type: "invoice", issueDate: { gte: monthStart } }, include: { lines: true } }),
  ]);
  const expectedRetainer = retainerAgg._sum.monthlyRetainer ?? 0;
  const monthInvoiced = monthInvoices.reduce((s, d) => s + d.lines.reduce((ss, l) => ss + l.lineTotal, 0), 0);
  const expectedMonthlyRevenue = expectedRetainer + monthInvoiced;
  const fixedMonthlyExpenses = recurringExpenses.reduce((s, e) => s + e.amount, 0);
  const expectedMonthlyResult = expectedMonthlyRevenue - fixedMonthlyExpenses;

  const yearRevenue = invoices.reduce((s, d) => s + d.lines.reduce((ss, l) => ss + l.lineTotal, 0), 0);
  const yearExpenses = expenses._sum.amount ?? 0;
  const yearProfit = yearRevenue - yearExpenses;

  const goalPercent = goal ? Math.min(100, Math.round((yearRevenue / goal.targetRevenue) * 100)) : null;

  // Monthly breakdown (current year)
  const monthlyData: Record<number, number> = {};
  for (const doc of invoices) {
    const m = new Date(doc.issueDate).getMonth();
    const total = doc.lines.reduce((s, l) => s + l.lineTotal, 0);
    monthlyData[m] = (monthlyData[m] ?? 0) + total;
  }

  const MONTHS = ["Яну", "Фев", "Мар", "Апр", "Май", "Юни", "Юли", "Авг", "Сеп", "Окт", "Ное", "Дек"];
  const maxMonth = Math.max(...Object.values(monthlyData), 1);

  // Financial health score (rule-based)
  let healthScore = 50;
  if (yearProfit > 0) healthScore += 20;
  if (overdueCount === 0) healthScore += 15;
  if (goalPercent && goalPercent > 50) healthScore += 15;
  healthScore = Math.min(100, healthScore);
  const healthLabel = healthScore >= 80 ? "Отлично" : healthScore >= 60 ? "Добро" : "Нуждае се от внимание";

  return (
    <>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 25, fontWeight: 600, margin: "0 0 3px" }}>Финансови Анализи</h1>
        <div style={{ color: "var(--muted)", fontSize: 13 }}>{year} г.</div>
      </div>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 24 }}>
        {[
          { label: `Приходи ${year}`, value: yearRevenue, color: "var(--emerald)" },
          { label: `Разходи ${year}`, value: yearExpenses, color: "var(--brick)" },
          { label: "Нетна печалба", value: yearProfit, color: "var(--navy)" },
          { label: "Марж", value: yearRevenue > 0 ? Math.round((yearProfit / yearRevenue) * 100) : 0, isPercent: true, color: "var(--brass)" },
        ].map((kpi) => (
          <div key={kpi.label} className="glass kpi-card">
            <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 8 }}>{kpi.label}</div>
            <div className="num" style={{ fontSize: 21, fontWeight: 600 }}>
              {kpi.isPercent ? `${kpi.value}%` : formatCurrency(kpi.value as number)}
            </div>
            {dual && !kpi.isPercent && (
              <div className="num" style={{ fontSize: 10.5, color: "var(--muted)", marginTop: 2 }}>
                ≈ {formatCurrency(toBGN(kpi.value as number), "BGN")}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Месечна прогноза — очаквани приходи (абонаменти + фактури) vs фиксирани разходи */}
      <div className="glass panel" style={{ marginBottom: 18 }}>
        <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 15, margin: "0 0 4px" }}>Месечна прогноза</h3>
        <p style={{ fontSize: 12, color: "var(--muted)", margin: "0 0 14px" }}>Очаквани месечни приходи (абонаментни договори + издадени фактури този месец) спрямо фиксираните месечни разходи.</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px,1fr))", gap: 14 }}>
          {[
            { l: "Очаквани месечни приходи", v: expectedMonthlyRevenue, c: "var(--emerald-dark)", sub: `${formatCurrency(expectedRetainer)} абонаменти + ${formatCurrency(monthInvoiced)} фактури` },
            { l: "Фиксирани месечни разходи", v: fixedMonthlyExpenses, c: "var(--brick)", sub: `${recurringExpenses.length} повтарящи се разхода` },
            { l: "Очакван месечен резултат", v: expectedMonthlyResult, c: expectedMonthlyResult >= 0 ? "var(--emerald-dark)" : "var(--brick)", sub: "приходи − фиксирани разходи" },
          ].map((k) => (
            <div key={k.l}>
              <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 4 }}>{k.l}</div>
              <div className="num" style={{ fontSize: 20, fontWeight: 700, color: k.c }}>{formatCurrency(k.v)}</div>
              <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>{k.sub}</div>
            </div>
          ))}
        </div>
        {recurringExpenses.length > 0 && (
          <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid var(--border)" }}>
            <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 8 }}>Фиксирани месечни разходи:</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {recurringExpenses.map((e) => (
                <span key={e.id} style={{ fontSize: 12, background: "var(--brick-soft)", color: "var(--brick)", borderRadius: 14, padding: "3px 11px", fontWeight: 600 }}>
                  {e.category?.name ? `${e.category.name}: ` : ""}{e.description} — {formatCurrency(e.amount)}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <div style={{ marginBottom: 18 }}>
        <TopClientsChart data={aggregateClientRevenue(invoices)} title={`Топ 5 клиента по приход (${year})`} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 18 }}>
        {/* Monthly chart — интерактивна */}
        <MonthlyBarChart months={MONTHS} values={MONTHS.map((_, i) => monthlyData[i] ?? 0)} currentIndex={now.getMonth()} title={`Приходи по месеци (${year})`} />

        {/* Right column */}
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {/* Financial health */}
          <div className="glass panel">
            <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 15, margin: "0 0 14px" }}>Финансово здраве</h3>
            <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
              <div className="num" style={{ fontSize: 36, fontWeight: 700 }}>{healthScore}</div>
              <div>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: healthScore >= 70 ? "var(--emerald)" : "var(--brass)" }}>
                  {healthLabel}
                </div>
                <ul style={{ listStyle: "none", padding: 0, margin: "6px 0 0", fontSize: 12, color: "var(--ink-soft)", display: "flex", flexDirection: "column", gap: 4 }}>
                  <li style={{ paddingLeft: 14, position: "relative" }}>
                    <span style={{ position: "absolute", left: 0 }}>–</span>
                    {yearProfit > 0 ? "Положителна печалба ✓" : "Отрицателна печалба"}
                  </li>
                  <li style={{ paddingLeft: 14, position: "relative" }}>
                    <span style={{ position: "absolute", left: 0 }}>–</span>
                    {overdueCount === 0 ? "Без просрочени фактури ✓" : `${overdueCount} просрочени фактури`}
                  </li>
                  <li style={{ paddingLeft: 14, position: "relative" }}>
                    <span style={{ position: "absolute", left: 0 }}>–</span>
                    {paidCount} платени фактури
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Financial goal */}
          <div className="glass panel">
            <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 15, margin: "0 0 14px" }}>Финансова цел {year}</h3>
            {goal ? (
              <>
                <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 6 }}>
                  Цел: <strong className="num">{formatCurrency(goal.targetRevenue)}</strong>
                </div>
                <div style={{ height: 8, background: "var(--brass-soft)", borderRadius: 6, overflow: "hidden", marginBottom: 6 }}>
                  <div style={{ height: "100%", width: `${goalPercent}%`, background: "var(--brass)", borderRadius: 6 }} />
                </div>
                <div className="num" style={{ fontSize: 12.5, color: "var(--muted)" }}>
                  {goalPercent}% изпълнение
                </div>
              </>
            ) : (
              <div style={{ fontSize: 13, color: "var(--muted)" }}>
                Не е зададена цел за {year} г.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Historical data */}
      <div className="glass panel" style={{ marginTop: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, gap: 12, flexWrap: "wrap" }}>
          <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 15, margin: 0 }}>Историческа справка (многогодишен тренд)</h3>
          <FinancialHistoryForm />
        </div>

        {financialHistory.length === 0 ? (
          <div style={{ fontSize: 13, color: "var(--muted)", padding: "12px 0" }}>
            Въведете оборотите и печалбата от предходни години, за да следите реалния растеж на бизнеса.
          </div>
        ) : (
          <>
          {/* Диаграма на приходите по години (#12) */}
          <div style={{ marginBottom: 16 }}>
            <MonthlyBarChart
              months={financialHistory.map((h) => String(h.year))}
              values={financialHistory.map((h) => h.revenue)}
              currentIndex={financialHistory.length - 1}
              title="Приходи по години"
            />
          </div>
          <table>
            <thead>
              <tr>
                <th>Година</th>
                <th className="num">Приходи</th>
                <th className="num">Печалба</th>
                <th className="num">Растеж</th>
                <th className="num">Служители</th>
              </tr>
            </thead>
            <tbody>
              {financialHistory.map((h, i) => {
                const prev = i > 0 ? financialHistory[i - 1].revenue : null;
                const growth = prev && prev > 0 ? ((h.revenue - prev) / prev) * 100 : null;
                return (
                  <tr key={h.id}>
                    <td style={{ fontWeight: 600 }}>{h.year}</td>
                    <td className="num">{formatCurrency(h.revenue)}</td>
                    <td className="num">{h.profit != null ? formatCurrency(h.profit) : "—"}</td>
                    <td className="num" style={{ color: growth == null ? "var(--muted)" : growth >= 0 ? "var(--emerald)" : "var(--brick)" }}>
                      {growth == null ? "—" : `${growth >= 0 ? "▲" : "▼"} ${Math.abs(growth).toFixed(1)}%`}
                    </td>
                    <td className="num">{h.employeeCount ?? "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </>
        )}
      </div>
    </>
  );
}
