import { requireCompany, getPlan } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { StatusSelect } from "@/components/app/StatusSelect";
import { FeatureLink, FeatureTab } from "@/components/app/FeatureLink";
import { formatCurrency, toBGN, isDualCurrencyActive, groupByMonth } from "@/lib/constants";
import { UiIcon } from "@/components/app/NavIcons";

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
  const plan = await getPlan(companyId);
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
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <FeatureLink plan={plan} feature="protocols" href="/dashboard/documents/protocols">ППП</FeatureLink>
          <FeatureLink plan={plan} feature="declarations" href="/dashboard/documents/declarations">Декларации</FeatureLink>
          <Link href="/dashboard/documents/new" className="btn btn-primary">+ Нов документ</Link>
        </div>
      </div>

      {/* Категории документи */}
      <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
        <span className="filter-tab active">Изходящи документи</span>
        <FeatureTab plan={plan} feature="protocols" href="/dashboard/documents/protocols">Протоколи (ППП)</FeatureTab>
        <FeatureTab plan={plan} feature="declarations" href="/dashboard/documents/declarations">Декларации за съответствие</FeatureTab>
        <FeatureTab plan={plan} feature="expenses" href="/dashboard/expenses">Разходни фактури</FeatureTab>
        <FeatureTab plan={plan} feature="bank_statements" href="/dashboard/bank-statements">Банкови извлечения</FeatureTab>
      </div>

      {/* Filter tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
        {[
          { label: "Всички", type: "" },
          { label: "Приходни фактури", type: "invoice" },
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

      {docs.length === 0 ? (
        <div className="glass panel" style={{ textAlign: "center", padding: "48px 0", color: "var(--muted)" }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 12, color: "var(--muted)" }}><UiIcon.doc width={34} height={34} /></div>
          <div style={{ fontSize: 14, marginBottom: 16 }}>Няма документи</div>
          <Link href="/dashboard/documents/new" className="btn btn-primary btn-sm">Създай първия документ</Link>
        </div>
      ) : (
        groupByMonth(docs).map((group) => (
          <div key={group.key} style={{ marginBottom: 18 }}>
            <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 15, margin: "0 0 8px" }}>{group.label}</h3>
            <div className="glass panel" style={{ padding: "8px 0" }}>
              <table>
                <thead>
                  <tr>
                    <th>Номер</th><th>Тип</th><th>Клиент</th><th>Дата</th><th>Падеж</th>
                    <th className="num">Сума</th>{dual && <th className="num">BGN</th>}<th>Статус</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {group.items.map((doc) => {
                    const total = doc.lines.reduce((s, l) => s + l.lineTotal, 0);
                    return (
                      <tr key={doc.id}>
                        <td className="num" style={{ color: "var(--muted)", fontSize: 12 }}>{doc.number}</td>
                        <td style={{ fontSize: 13 }}>{TYPE_LABELS[doc.type]}</td>
                        <td style={{ fontWeight: 600 }}>{doc.client?.name ?? "—"}</td>
                        <td style={{ color: "var(--ink-soft)", fontSize: 13 }}>{new Date(doc.issueDate).toLocaleDateString("bg-BG")}</td>
                        <td style={{ color: "var(--ink-soft)", fontSize: 13 }}>{doc.dueDate ? new Date(doc.dueDate).toLocaleDateString("bg-BG") : "—"}</td>
                        <td className="num" style={{ fontWeight: 600 }}>{formatCurrency(total, doc.currency)}</td>
                        {dual && <td className="num" style={{ fontSize: 11.5, color: "var(--muted)" }}>{formatCurrency(toBGN(total), "BGN")}</td>}
                        <td><StatusSelect id={doc.id} status={doc.status} /></td>
                        <td style={{ display: "flex", gap: 6 }}>
                          <Link href={`/dashboard/documents/${doc.id}`} className="btn btn-ghost btn-sm">Преглед</Link>
                          <Link href={`/dashboard/documents/${doc.id}/edit`} className="btn btn-ghost btn-sm" title="Редактирай" style={{ display: "inline-flex", alignItems: "center" }}><UiIcon.edit /></Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}
    </>
  );
}
