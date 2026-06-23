import { requireCompany } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Stamp } from "@/components/Stamp";
import { formatCurrency, toBGN, isDualCurrencyActive, DOC_STATUSES } from "@/lib/constants";

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { companyId } = await requireCompany();
  const params = await searchParams;
  const dual = isDualCurrencyActive();

  const invoices = await prisma.document.findMany({
    where: { companyId, type: "invoice", ...(params.status ? { status: params.status as never } : {}) },
    include: { client: true, lines: true },
    orderBy: { createdAt: "desc" },
  });

  const totals = invoices.reduce(
    (acc, d) => {
      const t = d.lines.reduce((s, l) => s + l.lineTotal, 0);
      acc.all += t;
      if (d.status === "paid") acc.paid += t;
      else if (d.status !== "cancelled") acc.outstanding += t;
      return acc;
    },
    { all: 0, paid: 0, outstanding: 0 }
  );

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 25, fontWeight: 600, margin: "0 0 3px" }}>Фактури</h1>
          <div style={{ color: "var(--muted)", fontSize: 13 }}>{invoices.length} фактури</div>
        </div>
        <Link href="/dashboard/documents/new?type=invoice" className="btn btn-primary">+ Нова фактура</Link>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 20 }}>
        {[
          { label: "Общо фактурирано", value: totals.all, color: "var(--navy)" },
          { label: "Платено", value: totals.paid, color: "var(--emerald)" },
          { label: "За събиране", value: totals.outstanding, color: "var(--brass)" },
        ].map((k) => (
          <div key={k.label} className="glass kpi-card">
            <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 8 }}>{k.label}</div>
            <div className="num" style={{ fontSize: 20, fontWeight: 600, color: k.color }}>{formatCurrency(k.value)}</div>
            {dual && <div className="num" style={{ fontSize: 10.5, color: "var(--muted)" }}>≈ {formatCurrency(toBGN(k.value), "BGN")}</div>}
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
        <Link href="/dashboard/invoices" className={`filter-tab${!params.status ? " active" : ""}`}>Всички</Link>
        {DOC_STATUSES.map((s) => (
          <Link key={s.value} href={`/dashboard/invoices?status=${s.value}`} className={`filter-tab${params.status === s.value ? " active" : ""}`}>
            {s.label}
          </Link>
        ))}
      </div>

      <div className="glass panel" style={{ padding: "8px 0" }}>
        {invoices.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px 0", color: "var(--muted)" }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🧾</div>
            <div style={{ fontSize: 14, marginBottom: 16 }}>Няма фактури</div>
            <Link href="/dashboard/documents/new?type=invoice" className="btn btn-primary btn-sm">Издай първата фактура</Link>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>№</th>
                <th>Клиент</th>
                <th>Дата</th>
                <th>Падеж</th>
                <th className="num">Сума</th>
                <th>Статус</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((doc) => {
                const total = doc.lines.reduce((s, l) => s + l.lineTotal, 0);
                return (
                  <tr key={doc.id}>
                    <td className="num" style={{ fontSize: 12.5 }}>{doc.number}</td>
                    <td style={{ fontWeight: 600 }}>{doc.client?.name ?? "—"}</td>
                    <td style={{ fontSize: 13, color: "var(--ink-soft)" }}>{new Date(doc.issueDate).toLocaleDateString("bg-BG")}</td>
                    <td style={{ fontSize: 13, color: "var(--ink-soft)" }}>{doc.dueDate ? new Date(doc.dueDate).toLocaleDateString("bg-BG") : "—"}</td>
                    <td className="num" style={{ fontWeight: 600 }}>{formatCurrency(total, doc.currency)}</td>
                    <td><Stamp status={doc.status} /></td>
                    <td><Link href={`/dashboard/documents/${doc.id}`} className="btn btn-ghost btn-sm">Отвори</Link></td>
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
