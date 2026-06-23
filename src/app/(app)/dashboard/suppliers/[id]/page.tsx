import { requireCompany } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { formatCurrency } from "@/lib/constants";

export default async function SupplierDossierPage({ params }: { params: Promise<{ id: string }> }) {
  const { companyId } = await requireCompany();
  const { id } = await params;

  const supplier = await prisma.supplier.findFirst({
    where: { id, companyId },
    include: { expenses: { orderBy: { date: "desc" } }, contracts: true },
  });
  if (!supplier) notFound();

  const totalSpent = supplier.expenses.reduce((s, e) => s + e.amount, 0);

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20, flexWrap: "wrap" }}>
        <Link href="/dashboard/suppliers" style={{ color: "var(--muted)", textDecoration: "none", fontSize: 13 }}>← Доставчици</Link>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 600, margin: 0 }}>{supplier.name}</h1>
        {supplier.rating && <span style={{ color: "var(--brass)" }}>{"★".repeat(supplier.rating)}{"☆".repeat(5 - supplier.rating)}</span>}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.6fr", gap: 18, alignItems: "start" }}>
        <div className="glass panel">
          <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 15, margin: "0 0 12px" }}>Данни</h3>
          <dl style={{ margin: 0, fontSize: 13, display: "grid", gridTemplateColumns: "auto 1fr", gap: "8px 12px" }}>
            {[["ЕИК", supplier.eik], ["ДДС №", supplier.vatNumber], ["Адрес", supplier.address], ["Имейл", supplier.contactEmail], ["Телефон", supplier.phone]]
              .filter(([, v]) => v).map(([k, v]) => (
              <div key={k as string} style={{ display: "contents" }}>
                <dt style={{ color: "var(--muted)" }}>{k}</dt><dd style={{ margin: 0, fontWeight: 500 }}>{v}</dd>
              </div>
            ))}
          </dl>
          {supplier.notes && <p style={{ fontSize: 12.5, color: "var(--ink-soft)", marginTop: 12 }}>{supplier.notes}</p>}
          <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--border)" }}>
            <div style={{ fontSize: 12, color: "var(--muted)" }}>Общо разходи</div>
            <div className="num" style={{ fontSize: 20, fontWeight: 700 }}>{formatCurrency(totalSpent)}</div>
          </div>
        </div>

        <div className="glass panel" style={{ padding: "8px 0" }}>
          <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 15, margin: "12px 16px" }}>Разходи ({supplier.expenses.length})</h3>
          {supplier.expenses.length === 0 ? (
            <div style={{ padding: "8px 16px 16px", color: "var(--muted)", fontSize: 13 }}>Няма разходи.</div>
          ) : (
            <table>
              <thead><tr><th style={{ paddingLeft: 16 }}>Описание</th><th>Дата</th><th className="num">Сума</th></tr></thead>
              <tbody>
                {supplier.expenses.map((e) => (
                  <tr key={e.id}>
                    <td style={{ paddingLeft: 16, fontWeight: 600 }}>{e.description}</td>
                    <td style={{ fontSize: 13, color: "var(--ink-soft)" }}>{new Date(e.date).toLocaleDateString("bg-BG")}</td>
                    <td className="num">{formatCurrency(e.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}
