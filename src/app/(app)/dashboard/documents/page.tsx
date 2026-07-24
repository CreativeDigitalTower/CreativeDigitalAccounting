import { requireCompany, getPlan } from "@/lib/session";
import { DOC_ORDER } from "@/lib/documentSort";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { FeatureLink, FeatureTab } from "@/components/app/FeatureLink";
import { DocumentBrowser, type DocRow } from "@/components/app/DocumentBrowser";
import { getT } from "@/lib/i18n/server";

export default async function DocumentsPage() {
  const { companyId } = await requireCompany();
  const plan = await getPlan(companyId);
  const { t } = await getT();

  const docs = await prisma.document.findMany({
    where: { companyId },
    include: { client: { select: { id: true, name: true } }, lines: { select: { lineTotal: true } } },
    orderBy: DOC_ORDER,
  });

  const rows: DocRow[] = docs.map((d) => ({
    id: d.id, number: d.number, type: d.type,
    clientId: d.client?.id ?? null, clientName: d.client?.name ?? null,
    issueDate: d.issueDate.toISOString(), dueDate: d.dueDate?.toISOString() ?? null, createdAt: d.createdAt.toISOString(),
    total: d.lines.reduce((s, l) => s + l.lineTotal, 0), currency: d.currency, status: d.status,
  }));

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
      <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
        <span className="filter-tab active">{t("documents.page.cat.outgoing")}</span>
        <FeatureTab plan={plan} feature="protocols" href="/dashboard/documents/protocols">{t("documents.page.cat.protocols")}</FeatureTab>
        <FeatureTab plan={plan} feature="declarations" href="/dashboard/documents/declarations">{t("documents.page.cat.declarations")}</FeatureTab>
        <FeatureTab plan={plan} feature="expenses" href="/dashboard/expenses">{t("documents.page.cat.expenses")}</FeatureTab>
        <FeatureTab plan={plan} feature="bank_statements" href="/dashboard/bank-statements">{t("documents.page.cat.bank")}</FeatureTab>
      </div>

      {docs.length === 0 ? (
        <div className="glass panel" style={{ textAlign: "center", padding: "48px 0", color: "var(--muted)" }}>
          <div style={{ fontSize: 14, marginBottom: 16 }}>{t("documents.page.empty")}</div>
          <Link href="/dashboard/documents/new" className="btn btn-primary btn-sm">{t("documents.page.createFirst")}</Link>
        </div>
      ) : (
        <DocumentBrowser docs={rows} />
      )}
    </>
  );
}
