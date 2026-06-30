import { requireFeature } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { FinancialHistoryForm } from "@/components/app/FinancialHistoryForm";
import { TopClientsChart } from "@/components/app/TopClientsChart";
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

      <div style={{ marginBottom: 18 }}>
        <TopClientsChart data={aggregateClientRevenue(invoices)} title={`Топ 5 клиента по приход (${year})`} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 18 }}>
        {/* Monthly chart */}
        <div className="glass panel">
          <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 15, margin: "0 0 18px" }}>Приходи по месеци ({year})</h3>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 120 }}>
            {MONTHS.map((month, i) => {
              const val = monthlyData[i] ?? 0;
              const height = maxMonth > 0 ? Math.max(4, (val / maxMonth) * 110) : 4;
              return (
                <div key={month} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                  <div
                    title={formatCurrency(val)}
                    style={{
                      width: "100%",
                      height,
                      background: i === now.getMonth()
                        ? "var(--emerald)"
                        : "rgba(31,111,84,.3)",
                      borderRadius: "3px 3px 0 0",
                      cursor: "pointer",
                      transition: "background .2s",
                    }}
                  />
                  <span style={{ fontSize: 9.5, color: "var(--muted)" }}>{month}</span>
                </div>
              );
            })}
          </div>
        </div>

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
        )}
      </div>
    </>
  );
}
