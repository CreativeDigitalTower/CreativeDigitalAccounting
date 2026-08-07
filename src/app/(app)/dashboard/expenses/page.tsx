import { requireFeature } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { formatCurrency, toBGN, isDualCurrencyActive, EUR_TO_BGN } from "@/lib/constants";
import { ExpensesList } from "@/components/app/ExpensesList";
import { groupExpenses, monthlyTotals, totalExpenses, type ExpenseForAnalysis } from "@/lib/expenseAnalysis";
import { getT } from "@/lib/i18n/server";

export default async function ExpensesPage({ searchParams }: { searchParams: Promise<{ period?: string }> }) {
  const { companyId } = await requireFeature("expenses");
  const { t, locale } = await getT();
  const dual = isDualCurrencyActive();
  const period = (await searchParams)?.period === "all" ? "all" : "month";

  const [expenses, totalResult, categories, suppliers] = await Promise.all([
    prisma.expense.findMany({
      where: { companyId },
      include: { category: true, supplier: true, project: true },
      orderBy: { date: "desc" },
    }),
    prisma.expense.aggregate({
      where: { companyId },
      _sum: { amount: true, vatAmount: true },
    }),
    prisma.expenseCategory.findMany({ where: { companyId }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.supplier.findMany({ where: { companyId }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  const total = totalResult._sum.amount ?? 0;
  const totalVat = totalResult._sum.vatAmount ?? 0;

  // ─── Анализ на разходите (по категория/доставчик/проект + месец/година) ───
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const forAnalysis: (ExpenseForAnalysis & { date: Date })[] = expenses.map((e) => ({
    amount: e.amount, date: e.date,
    categoryName: e.category?.name ?? null, supplierName: e.supplier?.name ?? null, projectName: e.project?.name ?? null,
  }));
  const scoped = period === "month" ? forAnalysis.filter((e) => e.date >= monthStart) : forAnalysis;
  const byCategory = groupExpenses(scoped, "category").slice(0, 8);
  const bySupplier = groupExpenses(scoped, "supplier").filter((r) => r.name !== "—").slice(0, 8);
  const byProject = groupExpenses(scoped, "project").filter((r) => r.name !== "—").slice(0, 8);
  const scopedTotal = totalExpenses(scoped);
  const monthly = monthlyTotals(forAnalysis, now.getFullYear());
  const maxMonthly = Math.max(1, ...monthly);

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 25, fontWeight: 600, margin: "0 0 3px" }}>{t("expenses.title")}</h1>
          <div style={{ color: "var(--muted)", fontSize: 13 }}>
            {t("expenses.totalLabel")} <strong className="num">{formatCurrency(total)}</strong>
            {dual && <span className="num" style={{ color: "var(--muted)", marginLeft: 8, fontSize: 12 }}>≈ {formatCurrency(toBGN(total), "BGN")}</span>}
          </div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <Link href="/dashboard/expenses/new" className="btn btn-primary">{t("expenses.newExpense")}</Link>
        </div>
      </div>

      {/* Category breakdown */}
      <div className="glass panel" style={{ marginBottom: 20, padding: "20px 24px" }}>
        <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 14, margin: "0 0 14px" }}>{t("expenses.vatSummary")}</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
          {[
            { label: t("expenses.net"), value: total - totalVat },
            { label: t("expenses.vat"), value: totalVat },
            { label: t("expenses.gross"), value: total },
          ].map((s) => (
            <div key={s.label}>
              <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 4 }}>{s.label}</div>
              <div className="num" style={{ fontSize: 18, fontWeight: 600 }}>{formatCurrency(s.value)}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ─── Анализ на разходите ─── */}
      {expenses.length > 0 && (
        <div className="glass panel" style={{ padding: "16px 20px", marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 12 }}>
            <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 15, margin: 0 }}>{t("expenses.analysis.title")} · <span className="num" style={{ color: "var(--brass)" }}>{formatCurrency(scopedTotal)}</span></h3>
            <div style={{ display: "flex", gap: 6 }}>
              <Link href="/dashboard/expenses?period=month" className={`filter-tab${period === "month" ? " active" : ""}`} style={{ fontSize: 11.5 }}>{t("expenses.analysis.thisMonth")}</Link>
              <Link href="/dashboard/expenses?period=all" className={`filter-tab${period === "all" ? " active" : ""}`} style={{ fontSize: 11.5 }}>{t("expenses.analysis.allTime")}</Link>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 18 }}>
            {[
              { title: t("expenses.analysis.byCategory"), rows: byCategory },
              { title: t("expenses.analysis.bySupplier"), rows: bySupplier },
              { title: t("expenses.analysis.byProject"), rows: byProject },
            ].map((g) => (
              <div key={g.title}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--brass)", letterSpacing: 1, marginBottom: 8, textTransform: "uppercase" }}>{g.title}</div>
                {g.rows.length === 0 ? <div style={{ fontSize: 12, color: "var(--muted)" }}>—</div> : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                    {g.rows.map((r) => (
                      <div key={r.name} style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5 }}>
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginRight: 8 }}>{r.name} <span style={{ color: "var(--muted)" }}>({r.count})</span></span>
                        <strong className="num">{formatCurrency(r.total)}</strong>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
          {/* Месечна серия за годината */}
          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--brass)", letterSpacing: 1, marginBottom: 8, textTransform: "uppercase" }}>{t("expenses.analysis.monthly", { year: now.getFullYear() })}</div>
            <div style={{ display: "flex", gap: 4, alignItems: "flex-end", height: 60 }}>
              {monthly.map((v, i) => (
                <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }} title={formatCurrency(v)}>
                  <div style={{ width: "100%", height: `${Math.round((v / maxMonthly) * 48)}px`, background: "var(--brass)", borderRadius: 3, minHeight: v > 0 ? 2 : 0 }} />
                  <span style={{ fontSize: 9, color: "var(--muted)" }}>{new Date(now.getFullYear(), i, 1).toLocaleDateString(locale, { month: "short" })}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {expenses.length === 0 ? (
        <div className="glass panel" style={{ textAlign: "center", padding: "48px 0", color: "var(--muted)" }}>
          <div style={{ fontSize: 14, marginBottom: 16 }}>{t("expenses.empty.none")}</div>
          <Link href="/dashboard/expenses/new" className="btn btn-primary btn-sm">{t("expenses.empty.add")}</Link>
        </div>
      ) : (
        <ExpensesList
          dual={dual}
          toBGNRate={EUR_TO_BGN}
          categories={categories}
          suppliers={suppliers}
          expenses={expenses.map((e) => ({
            id: e.id, description: e.description, category: e.category.name, categoryId: e.categoryId,
            supplier: e.supplier?.name ?? null, supplierId: e.supplierId, date: e.date.toISOString(),
            amount: e.amount, vatAmount: e.vatAmount, source: e.source, isRecurring: e.isRecurring, hasFile: !!e.attachmentUrl,
          }))}
        />
      )}
    </>
  );
}
