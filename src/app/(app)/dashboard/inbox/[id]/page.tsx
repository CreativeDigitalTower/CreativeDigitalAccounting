import { requireCompany } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { InvoiceDocument } from "@/components/app/InvoiceDocument";
import { OfferDocument } from "@/components/app/OfferDocument";
import { PrintButton } from "@/components/app/PrintButton";
import { toDocData } from "@/lib/docView";

export default async function InboxDocumentPage({ params }: { params: Promise<{ id: string }> }) {
  const { companyId } = await requireCompany();
  const { id } = await params;

  const doc = await prisma.document.findFirst({
    where: { id, recipientCompanyId: companyId },
    include: { client: true, lines: true, company: { include: { subscription: true } } },
  });
  if (!doc) notFound();

  const docData = toDocData(doc);

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18 }} className="no-print">
        <Link href="/dashboard/inbox" style={{ color: "var(--muted)", textDecoration: "none", fontSize: 13 }}>← Входящи</Link>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 20, fontWeight: 600, margin: 0 }}>{doc.number}</h1>
        <span style={{ fontSize: 12, color: "var(--muted)" }}>от {doc.company.name}</span>
        <span style={{ marginLeft: "auto" }}><PrintButton /></span>
      </div>
      <div className="printable">
        {doc.type === "quote" ? <OfferDocument data={docData} /> : <InvoiceDocument data={docData} />}
      </div>
    </>
  );
}
