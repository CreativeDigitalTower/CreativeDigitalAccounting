import { requireCompany } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { vatExemptReasonText } from "@/lib/constants";
import { notFound } from "next/navigation";
import Link from "next/link";
import { InvoiceDocument } from "@/components/app/InvoiceDocument";
import { OfferDocument } from "@/components/app/OfferDocument";

export default async function InboxDocumentPage({ params }: { params: Promise<{ id: string }> }) {
  const { companyId } = await requireCompany();
  const { id } = await params;

  const doc = await prisma.document.findFirst({
    where: { id, recipientCompanyId: companyId },
    include: { client: true, lines: true, company: { include: { subscription: true } } },
  });
  if (!doc) notFound();

  const plan = doc.company.subscription?.plan ?? "free";
  const showLogo = plan !== "free" && !!doc.company.logoUrl;

  const docData = {
    type: doc.type, number: doc.number, issueDate: doc.issueDate, taxEventDate: doc.taxEventDate, dueDate: doc.dueDate,
    currency: doc.currency, paymentMethod: doc.paymentMethod, notes: doc.notes, template: doc.template,
    logoUrl: showLogo ? doc.company.logoUrl : null,
    company: {
      name: doc.company.name, mol: doc.company.mol, address: doc.company.address, city: doc.company.city,
      eik: doc.company.eik, vatNumber: doc.company.vatRegistered ? doc.company.vatNumber : null, bankIban: doc.company.bankIban,
      bankName: doc.company.bankName, bankBic: doc.company.bankBic,
            phone: doc.company.phone, email: doc.company.email, website: doc.company.website,
    },
    client: doc.client ? { name: doc.client.name, mol: doc.client.mol, address: doc.client.address, city: doc.client.city, eik: doc.clientIsIndividual ? null : doc.client.eik, vatNumber: doc.clientIsIndividual ? null : doc.client.vatNumber } : null,
    vatExempt: doc.vatExempt, vatExemptReasonText: vatExemptReasonText(doc.vatExemptReason),
    lines: doc.lines.map((l) => ({ id: l.id, description: l.description, quantity: l.quantity, unitPrice: l.unitPrice, vatRate: l.vatRate, lineTotal: l.lineTotal })),
  };

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18 }}>
        <Link href="/dashboard/inbox" style={{ color: "var(--muted)", textDecoration: "none", fontSize: 13 }}>← Входящи</Link>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 20, fontWeight: 600, margin: 0 }}>{doc.number}</h1>
        <span style={{ fontSize: 12, color: "var(--muted)" }}>от {doc.company.name}</span>
      </div>
      <div className="printable">
        {doc.type === "quote" ? <OfferDocument data={docData} /> : <InvoiceDocument data={docData} />}
      </div>
    </>
  );
}
