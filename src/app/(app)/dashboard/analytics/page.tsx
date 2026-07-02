import { requireFeature } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { FinancialHistorySection } from "@/components/app/FinancialHistorySection";
import { TopClientsChart } from "@/components/app/TopClientsChart";
import { MonthlyBarChart } from "@/components/app/MonthlyBarChart";
import { MonthlyBackfill } from "@/components/app/MonthlyBackfill";
import { PriceIncreaseSimulator } from "@/components/app/PriceIncreaseSimulator";
import { aggregateClientRevenue } from "@/lib/clientRevenue";
import { formatCurrency, toBGN, isDualCurrencyActive } from "@/lib/constants";
import { sumPayroll } from "@/lib/payroll";

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

  // Заплати (разход) + ръчно въведени месечни данни за текущата година
  const [activeEmployees, payrollMonths, monthlyEntries] = await Promise.all([
    prisma.employee.findMany({ where: { companyId, active: true }, select: { salary: true } }),
    prisma.payrollMonth.findMany({ where: { companyId, year } }),
    prisma.monthlyEntry.findMany({ where: { companyId, year } }),
  ]);
  const defaultMonthlyPayroll = sumPayroll(activeEmployees.map((e) => e.salary ?? 0)).employerCost;
  const payrollByMonth = new Map(payrollMonths.map((p) => [p.month, p.amount]));
  const manualRevByMonth = new Map(monthlyEntries.map((m) => [m.month, m.revenue]));
  const manualExpByMonth = new Map(monthlyEntries.map((m) => [m.month, m.expenses]));
  const curMonth = now.getMonth();
  // Разход за заплати: за месеците от началото на годината до текущия (или ръчна корекция)
  let payrollExpense = 0;
  for (let m = 0; m <= curMonth; m++) payrollExpense += payrollByMonth.get(m) ?? defaultMonthlyPayroll;
  const manualRevenueTotal = monthlyEntries.reduce((s, m) => s + m.revenue, 0);
  const manualExpenseTotal = monthlyEntries.reduce((s, m) => s + m.expenses, 0);

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
  const currentMonthPayroll = payrollByMonth.get(now.getMonth()) ?? defaultMonthlyPayroll;
  const fixedMonthlyExpenses = recurringExpenses.reduce((s, e) => s + e.amount, 0) + currentMonthPayroll;
  const expectedMonthlyResult = expectedMonthlyRevenue - fixedMonthlyExpenses;

  const invoiceRevenue = invoices.reduce((s, d) => s + d.lines.reduce((ss, l) => ss + l.lineTotal, 0), 0);
  const yearRevenue = invoiceRevenue + manualRevenueTotal;
  const yearExpenses = (expenses._sum.amount ?? 0) + payrollExpense + manualExpenseTotal;
  const yearProfit = yearRevenue - yearExpenses;

  const goalPercent = goal ? Math.min(100, Math.round((yearRevenue / goal.targetRevenue) * 100)) : null;

  // Monthly breakdown (current year)
  const monthlyData: Record<number, number> = {};
  for (const doc of invoices) {
    const m = new Date(doc.issueDate).getMonth();
    const total = doc.lines.reduce((s, l) => s + l.lineTotal, 0);
    monthlyData[m] = (monthlyData[m] ?? 0) + total;
  }
  // добавяме ръчно въведените приходи по месеци
  for (const [m, rev] of manualRevByMonth) monthlyData[m] = (monthlyData[m] ?? 0) + rev;

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
            { l: "Фиксирани месечни разходи", v: fixedMonthlyExpenses, c: "var(--brick)", sub: `${recurringExpenses.length} повтарящи се + ${formatCurrency(currentMonthPayroll)} заплати` },
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

        </div>
      </div>

      {/* Симулация на увеличение на цените (абонаменти) */}
      <div style={{ marginTop: 18 }}>
        <PriceIncreaseSimulator monthlyRetainer={expectedRetainer} goalTarget={goal?.targetRevenue ?? null} />
      </div>

      {/* Заплати по месеци + ръчно въведени приходи/разходи (текуща година) */}
      <div style={{ marginTop: 18 }}>
        <MonthlyBackfill
          year={year}
          currentMonth={curMonth}
          defaultPayroll={defaultMonthlyPayroll}
          months={Array.from({ length: 12 }, (_, m) => ({
            month: m,
            payroll: payrollByMonth.has(m) ? (payrollByMonth.get(m) as number) : null,
            revenue: manualRevByMonth.get(m) ?? 0,
            expenses: manualExpByMonth.get(m) ?? 0,
          }))}
        />
      </div>

      {/* Финансова цел + Историческа справка (редакция, разходи, диаграма) */}
      <div style={{ marginTop: 18 }}>
        <FinancialHistorySection
          initial={financialHistory.map((h) => ({ year: h.year, revenue: h.revenue, expenses: h.expenses, profit: h.profit, employeeCount: h.employeeCount }))}
          goalYear={year}
          goalTarget={goal?.targetRevenue ?? null}
          goalRevenue={yearRevenue}
          currentExpenses={yearExpenses}
          currentProfit={yearProfit}
        />
      </div>
    </>
  );
}
