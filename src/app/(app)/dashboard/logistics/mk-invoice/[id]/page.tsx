import { requireLogistics } from "@/lib/logistics/access";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getT } from "@/lib/i18n/server";
import { getPlan } from "@/lib/session";
import { vatExemptReasonText } from "@/lib/constants";
import { InvoiceDocument } from "@/components/app/InvoiceDocument";
import { PrintButton } from "@/components/app/logistics/PrintButton";
import { buildInvoiceViewData } from "@/lib/logistics/mkInvoiceView";

const COMPANY_SELECT = {
  name: true, mol: true, address: true, city: true, eik: true, vatRegistered: true, vatNumber: true,
  bankIban: true, bankName: true, bankBic: true, phone: true, email: true, website: true, logoUrl: true,
} as const;

/**
 * READ-ONLY cross-company изглед на MK фактурата (§C2/§D). Активната фирма (Metal Trade)
 * НЕ се сменя. Достъпът е валиден САМО чрез explicit relation: Document/MkInvoice, чийто
 * sourceExportSet принадлежи на активната фирма (тя е продавачът на доставката). Произволен
 * Document ID без тази връзка → notFound (IDOR защита). Стандартният /dashboard/documents/[id]
 * остава company-scoped и непроменен.
 */
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { companyId } = await requireLogistics();
  const { id } = await params;
  const { t } = await getT();

  // Стандартна фактура (Document, source of truth), линкната към доставка на активната фирма.
  const doc = await prisma.document.findFirst({
    where: { id, type: "invoice", deletedAt: null, sourceExportSet: { is: { companyId, deletedAt: null } } },
    include: { company: { select: COMPANY_SELECT }, client: true, lines: true, sourceExportSet: { select: { id: true, invoiceNumber: true, destination: true } } },
  });

  if (doc) {
    const plan = await getPlan(doc.companyId);
    const data = buildInvoiceViewData(
      { ...doc, clientIsIndividual: doc.clientIsIndividual, company: doc.company, client: doc.client },
      { vatExemptReasonText: vatExemptReasonText(doc.vatExemptReason), showLogo: plan !== "free" && !!doc.company.logoUrl },
    );
    return <ReadOnlyShell t={t} issuer={doc.company.name} backSetId={doc.sourceExportSet?.id ?? null} backLabel={doc.sourceExportSet?.invoiceNumber ?? null}>
      <InvoiceDocument data={data} />
    </ReadOnlyShell>;
  }

  // Легаси MkInvoice fallback (ако още се ползва) — същата relation авторизация.
  const mk = await prisma.mkInvoice.findFirst({
    where: { id, sourceExportSet: { is: { companyId, deletedAt: null } } },
    include: { company: { select: { name: true } }, client: { select: { name: true } }, lines: true, sourceExportSet: { select: { id: true, invoiceNumber: true } } },
  });
  if (!mk) notFound();

  const dt = (d: Date | null) => d ? new Date(d).toLocaleDateString() : "—";
  return <ReadOnlyShell t={t} issuer={mk.company.name} backSetId={mk.sourceExportSet?.id ?? null} backLabel={mk.sourceExportSet?.invoiceNumber ?? null}>
    <div className="glass panel" style={{ maxWidth: 900 }}>
      <h2 style={{ fontFamily: "'Fraunces', serif", margin: "0 0 8px" }}>{mk.number}</h2>
      <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 10 }}>{dt(mk.date)} · {mk.client?.name ?? "—"} · {mk.currency}</div>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
        <thead><tr>{[t("logistics.mksale.product"), t("logistics.mksale.quantity"), t("logistics.mksale.unitPrice"), t("logistics.mksale.net")].map((h, i) => <th key={i} style={{ textAlign: "left", padding: "6px 8px", color: "var(--muted)" }}>{h}</th>)}</tr></thead>
        <tbody>
          {mk.lines.map((l) => (
            <tr key={l.id}><td style={{ padding: "6px 8px", borderTop: "1px solid rgba(217,215,200,.5)" }}>{l.productSnapshot ?? "—"}</td>
              <td style={{ padding: "6px 8px", borderTop: "1px solid rgba(217,215,200,.5)" }}>{l.quantity} {l.unit}</td>
              <td style={{ padding: "6px 8px", borderTop: "1px solid rgba(217,215,200,.5)" }}>{l.unitPrice}</td>
              <td style={{ padding: "6px 8px", borderTop: "1px solid rgba(217,215,200,.5)" }}>{l.lineTotal}</td></tr>
          ))}
        </tbody>
      </table>
    </div>
  </ReadOnlyShell>;
}

function ReadOnlyShell({ t, issuer, backSetId, backLabel, children }: {
  t: (k: string, v?: Record<string, string | number>) => string; issuer: string; backSetId: string | null; backLabel: string | null; children: React.ReactNode;
}) {
  return (
    <div style={{ maxWidth: 940 }}>
      <div className="no-print" style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12, flexWrap: "wrap" }}>
        {backSetId
          ? <Link href={`/dashboard/logistics/export/${backSetId}`} style={{ color: "var(--muted)", textDecoration: "none", fontSize: 13 }}>← {backLabel ?? t("logistics.export.title")}</Link>
          : <Link href="/dashboard/logistics/mk-sales" style={{ color: "var(--muted)", textDecoration: "none", fontSize: 13 }}>← {t("logistics.mksale.title")}</Link>}
        <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 10, background: "rgba(0,0,0,.06)", color: "var(--muted)" }}>{t("logistics.mkview.readOnly")}</span>
        <span style={{ fontSize: 12, color: "var(--muted)" }}>{t("logistics.mkview.issuedBy", { issuer })}</span>
        <PrintButton style={{ marginLeft: "auto" }} />
      </div>
      {children}
    </div>
  );
}
