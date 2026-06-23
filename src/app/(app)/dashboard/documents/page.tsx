import { requireCompany } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Stamp } from "@/components/Stamp";
import { formatCurrency, toBGN, isDualCurrencyActive } from "@/lib/constants";

const TYPE_LABELS: Record<string, string> = {
  invoice: "Фактура",
  proforma: "Проформа",
  quote: "Оферта",
  credit_note: "Кредитно известие",
  debit_note: "Дебитно известие",
};

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; status?: string }>;
}) {
  const { companyId } = await requireCompany();
  const params = await searchParams;
  const dual = isDualCurrencyActive();

  const docs = await prisma.document.findMany({
    where: {
      companyId,
      ...(params.type ? { type: params.type as never } : {}),
      ...(params.status ? { status: params.status as never } : {}),
    },
    include: { client: true, lines: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 18, marginBottom: 18, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 25, fontWeight: 600, margin: "0 0 3px" }}>Документи</h1>
          <div style={{ color: "var(--muted)", fontSize: 13 }}>{docs.length} документа</div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <Link href="/dashboard/documents/new" className="btn btn-primary">+ Нов документ</Link>
        </div>
      </div>

      {/* Filter tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
        {[
          { label: "Всички", type: "" },
          { label: "Фактури", type: "invoice" },
          { label: "Проформи", type: "proforma" },
          { label: "Оферти", type: "quote" },
          { label: "Кр. известия", type: "credit_note" },
          { label: "Деб. известия", type: "debit_note" },
        ].map((f) => (
          <Link
            key={f.type}
            href={`/dashboard/documents${f.type ? `?type=${f.type}` : ""}`}
            className={`filter-tab${(!params.type && !f.type) || params.type === f.type ? " active" : ""}`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      {/* Status filter */}
      <div style={{ display: "flex", gap: 6, marginBottom: 20, flexWrap: "wrap" }}>
        {[
          { label: "Всички статуси", status: "" },
          { label: "Чернова", status: "draft" },
          { label: "Изпратена", status: "sent" },
          { label: "Платена", status: "paid" },
          { label: "Просрочена", status: "overdue" },
        ].map((f) => (
          <Link
            key={f.status}
            href={`/dashboard/documents?${params.type ? `type=${params.type}&` : ""}${f.status ? `status=${f.status}` : ""}`}
            className={`filter-tab${(!params.status && !f.status) || params.status === f.status ? " active" : ""}`}
            style={{ fontSize: 11.5 }}
          >
            {f.label}
          </Link>
        ))}
      </div>

      <div className="glass panel" style={{ padding: "8px 0" }}>
        {docs.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px 0", color: "var(--muted)" }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>📄</div>
            <div style={{ fontSize: 14, marginBottom: 16 }}>Няма документи</div>
            <Link href="/dashboard/documents/new" className="btn btn-primary btn-sm">
              Създай първия документ
            </Link>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Номер</th>
                <th>Тип</th>
                <th>Клиент</th>
                <th>Дата</th>
                <th>Падеж</th>
                <th className="num">Сума</th>
                {dual && <th className="num">BGN</th>}
                <th>Статус</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {docs.map((doc) => {
                const total = doc.lines.reduce((s, l) => s + l.lineTotal, 0);
                return (
                  <tr key={doc.id} style={{ cursor: "pointer" }} onClick={() => {}}>
                    <td className="num" style={{ color: "var(--muted)", fontSize: 12 }}>{doc.number}</td>
                    <td style={{ fontSize: 13 }}>{TYPE_LABELS[doc.type]}</td>
                    <td style={{ fontWeight: 600 }}>{doc.client?.name ?? "—"}</td>
                    <td style={{ color: "var(--ink-soft)", fontSize: 13 }}>
                      {new Date(doc.issueDate).toLocaleDateString("bg-BG")}
                    </td>
                    <td style={{ color: "var(--ink-soft)", fontSize: 13 }}>
                      {doc.dueDate ? new Date(doc.dueDate).toLocaleDateString("bg-BG") : "—"}
                    </td>
                    <td className="num" style={{ fontWeight: 600 }}>{formatCurrency(total)}</td>
                    {dual && <td className="num" style={{ fontSize: 11.5, color: "var(--muted)" }}>{formatCurrency(toBGN(total), "BGN")}</td>}
                    <td><Stamp status={doc.status} /></td>
                    <td>
                      <Link href={`/dashboard/documents/${doc.id}`} className="btn btn-ghost btn-sm">
                        Преглед
                      </Link>
                    </td>
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
