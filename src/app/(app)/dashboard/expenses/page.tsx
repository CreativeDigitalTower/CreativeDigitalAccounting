import { requireFeature } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { formatCurrency, toBGN, isDualCurrencyActive } from "@/lib/constants";
import { AttachmentCell } from "@/components/app/AttachmentCell";

export default async function ExpensesPage() {
  const { companyId } = await requireFeature("expenses");
  const dual = isDualCurrencyActive();

  const [expenses, totalResult] = await Promise.all([
    prisma.expense.findMany({
      where: { companyId },
      include: { category: true, supplier: true },
      orderBy: { date: "desc" },
    }),
    prisma.expense.aggregate({
      where: { companyId },
      _sum: { amount: true, vatAmount: true },
    }),
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

      <div className="glass panel" style={{ padding: "8px 0" }}>
        {expenses.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px 0", color: "var(--muted)" }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>💰</div>
            <div style={{ fontSize: 14, marginBottom: 16 }}>Няма въведени разходи</div>
            <Link href="/dashboard/expenses/new" className="btn btn-primary btn-sm">Добави разход</Link>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Описание</th>
                <th>Категория</th>
                <th>Доставчик</th>
                <th>Дата</th>
                <th>Тип</th>
                <th className="num">Нето</th>
                <th className="num">ДДС</th>
                <th className="num">Бруто</th>
                {dual && <th className="num">BGN</th>}
                <th>Файл</th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((exp) => (
                <tr key={exp.id}>
                  <td style={{ fontWeight: 600 }}>{exp.description}</td>
                  <td>
                    <span style={{ background: "var(--navy-soft)", color: "var(--navy)", borderRadius: 20, padding: "3px 10px", fontSize: 12, fontWeight: 600 }}>
                      {exp.category.name}
                    </span>
                  </td>
                  <td style={{ color: "var(--ink-soft)", fontSize: 13 }}>{exp.supplier?.name ?? "—"}</td>
                  <td style={{ color: "var(--ink-soft)", fontSize: 13 }}>
                    {new Date(exp.date).toLocaleDateString("bg-BG")}
                  </td>
                  <td>
                    <span style={{ fontSize: 11.5, color: exp.source === "incoming_invoice" ? "var(--navy)" : "var(--muted)" }}>
                      {exp.source === "incoming_invoice" ? "Вх. фактура" : "Ръчно"}
                    </span>
                  </td>
                  <td className="num">{formatCurrency(exp.amount - exp.vatAmount)}</td>
                  <td className="num">{formatCurrency(exp.vatAmount)}</td>
                  <td className="num" style={{ fontWeight: 600 }}>{formatCurrency(exp.amount)}</td>
                  {dual && <td className="num" style={{ fontSize: 11.5, color: "var(--muted)" }}>{formatCurrency(toBGN(exp.amount), "BGN")}</td>}
                  <td><AttachmentCell endpoint={`/api/expenses/${exp.id}`} hasFile={!!exp.attachmentUrl} maxMB={3} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
