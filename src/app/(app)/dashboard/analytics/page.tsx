import { requireFeature } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { FinancialHistorySection } from "@/components/app/FinancialHistorySection";
import { MonthlyBackfill } from "@/components/app/MonthlyBackfill";
import { PriceIncreaseSimulator } from "@/components/app/PriceIncreaseSimulator";
import { formatCurrency, isDualCurrencyActive } from "@/lib/constants";
import { sumPayroll } from "@/lib/payroll";
import { VatRegistrationForecast } from "@/components/app/VatRegistrationForecast";
import { resolvePeriod, computeAnalytics } from "@/lib/bi/analytics";
import { AnalyticsPeriod } from "@/components/bi/AnalyticsPeriod";
import { AnalyticsOverview } from "@/components/bi/AnalyticsOverview";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<{ period?: string; from?: string; to?: string }> }) {
  const { companyId } = await requireFeature("analytics");
  const sp = await searchParams;
  const now = new Date();
  const year = now.getFullYear();
  const yearStart = new Date(year, 0, 1);

  // ─── Actionable BI обзор за избрания период ───
  const period = resolvePeriod(sp);
  const analytics = await computeAnalytics(companyId, period);

  // ─── Годишни инструменти (независими от избора на период) ───
  const [invoices, goal, financialHistory] = await Promise.all([
    prisma.document.findMany({ where: { companyId, type: "invoice", issueDate: { gte: yearStart } }, include: { lines: true } }),
    prisma.financialGoal.findUnique({ where: { companyId_year: { companyId, year } } }),
    prisma.financialHistory.findMany({ where: { companyId }, orderBy: { year: "asc" } }),
  ]);

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
  let payrollExpense = 0;
  for (let m = 0; m <= curMonth; m++) payrollExpense += payrollByMonth.get(m) ?? defaultMonthlyPayroll;
  const manualRevenueTotal = monthlyEntries.reduce((s, m) => s + m.revenue, 0);
  const manualExpenseTotal = monthlyEntries.reduce((s, m) => s + m.expenses, 0);

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const [retainerAgg, recurringExpenses, monthInvoices, expensesYearAgg] = await Promise.all([
    prisma.client.aggregate({ where: { companyId, monthlyRetainer: { not: null } }, _sum: { monthlyRetainer: true } }),
    prisma.expense.findMany({ where: { companyId, isRecurring: true }, include: { category: true } }),
    prisma.document.findMany({ where: { companyId, type: "invoice", issueDate: { gte: monthStart } }, include: { lines: true } }),
    prisma.expense.aggregate({ where: { companyId, date: { gte: yearStart } }, _sum: { amount: true } }),
  ]);
  const expectedRetainer = retainerAgg._sum.monthlyRetainer ?? 0;
  const monthInvoiced = monthInvoices.reduce((s, d) => s + d.lines.reduce((ss, l) => ss + l.lineTotal, 0), 0);
  const expectedMonthlyRevenue = expectedRetainer + monthInvoiced;
  const currentMonthPayroll = payrollByMonth.get(now.getMonth()) ?? defaultMonthlyPayroll;
  const fixedMonthlyExpenses = recurringExpenses.reduce((s, e) => s + e.amount, 0) + currentMonthPayroll;
  const expectedMonthlyResult = expectedMonthlyRevenue - fixedMonthlyExpenses;

  const companyVat = await prisma.company.findUnique({ where: { id: companyId }, select: { vatRegistered: true } });

  const invoiceRevenue = invoices.reduce((s, d) => s + d.lines.reduce((ss, l) => ss + l.lineTotal, 0), 0);
  const yearRevenue = invoiceRevenue + manualRevenueTotal;
  const yearExpenses = (expensesYearAgg._sum.amount ?? 0) + payrollExpense + manualExpenseTotal;
  const yearProfit = yearRevenue - yearExpenses;

  const VAT_THRESHOLD_EUR = 51130;
  const VAT_THRESHOLD_BGN = 100000;
  const vatTurnover = yearRevenue;
  const monthsElapsed = curMonth + 1;
  const vatMonthlyRunRate = Math.max(expectedRetainer, vatTurnover / monthsElapsed);

  const dual = isDualCurrencyActive();

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 14, flexWrap: "wrap", marginBottom: 18 }}>
        <div>
          <div className="bi-eyebrow">Финансови анализи</div>
          <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 25, fontWeight: 600, margin: "2px 0 0" }}>Какво се случва в бизнеса Ви</h1>
          <div style={{ color: "var(--muted)", fontSize: 13, marginTop: 2 }}>Период: <strong style={{ color: "var(--ink-soft)" }}>{analytics.period.label}</strong>{analytics.enoughToCompare ? "" : " · няма съпоставим предходен период"}</div>
        </div>
        <AnalyticsPeriod active={period.id} />
      </div>

      {/* ═══ BI обзор за избрания период ═══ */}
      <AnalyticsOverview data={analytics} />

      {/* ─── Годишни справки и инструменти ─── */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "26px 0 16px" }}>
        <span className="bi-eyebrow" style={{ color: "var(--brass)" }}>Годишни справки и инструменти · {year}</span>
        <div style={{ flex: 1, height: 1, background: "var(--bi-grid)" }} />
      </div>

      {/* Месечна прогноза (абонаменти + фактури vs фиксирани разходи) */}
      <div className="bi-card bi-flat bi-in" style={{ marginBottom: 16 }}>
        <div className="bi-eyebrow" style={{ color: "var(--emerald-dark)", marginBottom: 4 }}>Месечна прогноза</div>
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
      </div>

      {/* Прогноза за регистрация по ДДС (нерегистрирани фирми) */}
      {!companyVat?.vatRegistered && (
        <div style={{ marginBottom: 16 }}>
          <VatRegistrationForecast registered={!!companyVat?.vatRegistered} turnover={vatTurnover} threshold={VAT_THRESHOLD_EUR} thresholdBgn={VAT_THRESHOLD_BGN} monthlyRunRate={vatMonthlyRunRate} year={year} />
        </div>
      )}

      {/* Симулация на увеличение на цените */}
      <div style={{ marginBottom: 16 }}>
        <PriceIncreaseSimulator monthlyRetainer={expectedRetainer} goalTarget={goal?.targetRevenue ?? null} />
      </div>

      {/* Заплати по месеци + ръчни приходи/разходи */}
      <div style={{ marginBottom: 16 }}>
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

      {/* Финансова цел + Историческа справка */}
      <div style={{ marginBottom: 8 }}>
        <FinancialHistorySection
          initial={financialHistory.map((h) => ({ year: h.year, revenue: h.revenue, expenses: h.expenses, profit: h.profit, employeeCount: h.employeeCount }))}
          goalYear={year}
          goalTarget={goal?.targetRevenue ?? null}
          goalRevenue={yearRevenue}
          currentExpenses={yearExpenses}
          currentProfit={yearProfit}
        />
      </div>

      {dual && <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 8 }}>Сумите се визуализират в EUR; двойно EUR/BGN обозначаване е активно за официалните документи.</div>}
    </>
  );
}
