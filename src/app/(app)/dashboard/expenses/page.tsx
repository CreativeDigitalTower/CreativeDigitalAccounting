import { requireFeature } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { formatCurrency, toBGN, isDualCurrencyActive, EUR_TO_BGN } from "@/lib/constants";
import { ExpensesList } from "@/components/app/ExpensesList";

export default async function ExpensesPage() {
  const { companyId } = await requireFeature("expenses");
  const dual = isDualCurrencyActive();

  const [expenses, totalResult, categories, suppliers] = await Promise.all([
    prisma.expense.findMany({
      where: { companyId },
      include: { category: true, supplier: true },
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

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 25, fontWeight: 600, margin: "0 0 3px" }}>Разходи</h1>
          <div style={{ color: "var(--muted)", fontSize: 13 }}>
            Общо: <strong className="num">{formatCurrency(total)}</strong>
            {dual && <span className="num" style={{ color: "var(--muted)", marginLeft: 8, fontSize: 12 }}>≈ {formatCurrency(toBGN(total), "BGN")}</span>}
          </div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <Link href="/dashboard/expenses/new" className="btn btn-primary">+ Нов разход</Link>
        </div>
      </div>

      {/* Category breakdown */}
      <div className="glass panel" style={{ marginBottom: 20, padding: "20px 24px" }}>
        <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 14, margin: "0 0 14px" }}>ДДС обобщение</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
          {[
            { label: "Нето разходи", value: total - totalVat },
            { label: "ДДС по разходи", value: totalVat },
            { label: "Бруто разходи", value: total },
          ].map((s) => (
            <div key={s.label}>
              <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 4 }}>{s.label}</div>
              <div className="num" style={{ fontSize: 18, fontWeight: 600 }}>{formatCurrency(s.value)}</div>
            </div>
          ))}
        </div>
      </div>

      {expenses.length === 0 ? (
        <div className="glass panel" style={{ textAlign: "center", padding: "48px 0", color: "var(--muted)" }}>
          <div style={{ fontSize: 14, marginBottom: 16 }}>Няма въведени разходи</div>
          <Link href="/dashboard/expenses/new" className="btn btn-primary btn-sm">Добави разход</Link>
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
