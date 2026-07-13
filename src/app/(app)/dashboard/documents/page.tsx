import { requireCompany, getPlan } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { StatusSelect } from "@/components/app/StatusSelect";
import { FeatureLink, FeatureTab } from "@/components/app/FeatureLink";
import { formatCurrency, toBGN, isDualCurrencyActive, groupByMonth } from "@/lib/constants";
import { UiIcon } from "@/components/app/NavIcons";
import { getT } from "@/lib/i18n/server";

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; status?: string }>;
}) {
  const { companyId } = await requireCompany();
  const plan = await getPlan(companyId);
  const params = await searchParams;
  const dual = isDualCurrencyActive();
  const { t, locale } = await getT();

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
          <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 25, fontWeight: 600, margin: "0 0 3px" }}>{t("documents.page.title")}</h1>
          <div style={{ color: "var(--muted)", fontSize: 13 }}>{t("documents.page.count", { n: docs.length })}</div>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <FeatureLink plan={plan} feature="protocols" href="/dashboard/documents/protocols">{t("documents.page.ppp")}</FeatureLink>
          <FeatureLink plan={plan} feature="declarations" href="/dashboard/documents/declarations">{t("documents.page.declarations")}</FeatureLink>
          <Link href="/dashboard/documents/new" className="btn btn-primary">{t("documents.page.newDoc")}</Link>
        </div>
      </div>

      {/* Категории документи */}
      <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
        <span className="filter-tab active">{t("documents.page.cat.outgoing")}</span>
        <FeatureTab plan={plan} feature="protocols" href="/dashboard/documents/protocols">{t("documents.page.cat.protocols")}</FeatureTab>
        <FeatureTab plan={plan} feature="declarations" href="/dashboard/documents/declarations">{t("documents.page.cat.declarations")}</FeatureTab>
        <FeatureTab plan={plan} feature="expenses" href="/dashboard/expenses">{t("documents.page.cat.expenses")}</FeatureTab>
        <FeatureTab plan={plan} feature="bank_statements" href="/dashboard/bank-statements">{t("documents.page.cat.bank")}</FeatureTab>
      </div>

      {/* Filter tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
        {[
          { label: t("documents.page.filter.all"), type: "" },
          { label: t("documents.page.filter.invoice"), type: "invoice" },
          { label: t("documents.page.filter.proforma"), type: "proforma" },
          { label: t("documents.page.filter.quote"), type: "quote" },
          { label: t("documents.page.filter.credit"), type: "credit_note" },
          { label: t("documents.page.filter.debit"), type: "debit_note" },
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
          { label: t("documents.page.statusAll"), status: "" },
          { label: t("documents.status.draft"), status: "draft" },
          { label: t("documents.status.sent"), status: "sent" },
          { label: t("documents.status.paid"), status: "paid" },
          { label: t("documents.status.overdue"), status: "overdue" },
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
          <div style={{ fontSize: 14, marginBottom: 16 }}>{t("documents.page.empty")}</div>
          <Link href="/dashboard/documents/new" className="btn btn-primary btn-sm">{t("documents.page.createFirst")}</Link>
        </div>
      ) : (
        groupByMonth(docs).map((group) => (
          <div key={group.key} style={{ marginBottom: 18 }}>
            <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 15, margin: "0 0 8px" }}>{group.label}</h3>
            <div className="glass panel" style={{ padding: "8px 0" }}>
              <table>
                <thead>
                  <tr>
                    <th>{t("documents.page.th.number")}</th><th>{t("documents.page.th.type")}</th><th>{t("documents.page.th.client")}</th><th>{t("documents.page.th.date")}</th><th>{t("documents.page.th.due")}</th>
                    <th className="num">{t("documents.page.th.amount")}</th>{dual && <th className="num">BGN</th>}<th>{t("documents.page.th.status")}</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {group.items.map((doc) => {
                    const total = doc.lines.reduce((s, l) => s + l.lineTotal, 0);
                    return (
                      <tr key={doc.id}>
                        <td className="num" style={{ color: "var(--muted)", fontSize: 12 }}>{doc.number}</td>
                        <td style={{ fontSize: 13 }}>{t(`documents.types.${doc.type}`)}</td>
                        <td style={{ fontWeight: 600 }}>{doc.client?.name ?? "—"}</td>
                        <td style={{ color: "var(--ink-soft)", fontSize: 13 }}>{new Date(doc.issueDate).toLocaleDateString(locale)}</td>
                        <td style={{ color: "var(--ink-soft)", fontSize: 13 }}>{doc.dueDate ? new Date(doc.dueDate).toLocaleDateString(locale) : "—"}</td>
                        <td className="num" style={{ fontWeight: 600 }}>{formatCurrency(total, doc.currency)}</td>
                        {dual && <td className="num" style={{ fontSize: 11.5, color: "var(--muted)" }}>{formatCurrency(toBGN(total), "BGN")}</td>}
                        <td><StatusSelect id={doc.id} status={doc.status} /></td>
                        <td style={{ display: "flex", gap: 6 }}>
                          <Link href={`/dashboard/documents/${doc.id}`} className="btn btn-ghost btn-sm">{t("documents.page.view")}</Link>
                          <Link href={`/dashboard/documents/${doc.id}/edit`} className="btn btn-ghost btn-sm" title={t("documents.page.edit")} style={{ display: "inline-flex", alignItems: "center" }}><UiIcon.edit /></Link>
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
