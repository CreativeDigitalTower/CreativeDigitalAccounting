import { requirePaidPlan } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { DownloadButtons } from "@/components/app/DownloadButtons";
import { AttachProtocolToInvoice } from "@/components/app/AttachProtocolToInvoice";
import { HandoverDoc, DddDoc } from "@/components/app/ProtocolDocs";
import { PLATFORM_CREDIT } from "@/lib/constants";
import { DOC_ORDER } from "@/lib/documentSort";
import { getT } from "@/lib/i18n/server";

export default async function ProtocolDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { companyId } = await requirePaidPlan();
  const { t, locale } = await getT();
  const { id } = await params;
  const [p, company, invoices] = await Promise.all([
    prisma.handoverProtocol.findFirst({ where: { id, companyId } }),
    prisma.company.findUnique({ where: { id: companyId } }),
    prisma.document.findMany({ where: { companyId, type: { in: ["invoice", "proforma"] } }, select: { id: true, number: true, type: true }, orderBy: DOC_ORDER, take: 100 }),
  ]);
  if (!p || !company) notFound();

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20, flexWrap: "wrap" }} className="no-print">
        <Link href="/dashboard/documents/protocols" style={{ color: "var(--muted)", textDecoration: "none", fontSize: 13 }}>{t("subdocs.prot.doc.back")}</Link>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 20, fontWeight: 600, margin: 0 }}>{p.number}</h1>
        <div style={{ marginLeft: "auto", display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <AttachProtocolToInvoice protocolNumber={p.number} invoices={invoices} />
          <DownloadButtons filename={p.number} />
        </div>
      </div>

      <div className="glass printable" style={{ borderRadius: 14, maxWidth: p.kind === "ddd" ? 1000 : 800, padding: "40px 48px", background: "#fff" }}>
        {p.kind === "ddd"
          ? <DddDoc p={p} locale={locale} />
          : <HandoverDoc p={p} company={company} locale={locale} />}

        <div style={{ marginTop: 28, paddingTop: 12, borderTop: "1px solid var(--border)", fontSize: 10.5, color: "var(--muted)", textAlign: "center" }}>
          {PLATFORM_CREDIT}
        </div>
      </div>
    </>
  );
}
