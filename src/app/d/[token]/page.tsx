import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { InvoiceDocument } from "@/components/app/InvoiceDocument";
import { OfferDocument } from "@/components/app/OfferDocument";
import { PublicDocDecision } from "@/components/app/PublicDocDecision";
import { PLATFORM_NAME } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function PublicDocumentPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const doc = await prisma.document.findUnique({
    where: { publicToken: token },
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
      eik: doc.company.eik, vatNumber: doc.company.vatNumber, bankIban: doc.company.bankIban,
      bankName: doc.company.bankName, bankBic: doc.company.bankBic,
    },
    client: doc.client ? {
      name: doc.client.name, mol: doc.client.mol, address: doc.client.address, city: doc.client.city,
      eik: doc.client.eik, vatNumber: doc.client.vatNumber,
    } : null,
    lines: doc.lines.map((l) => ({ id: l.id, description: l.description, quantity: l.quantity, unitPrice: l.unitPrice, vatRate: l.vatRate, lineTotal: l.lineTotal })),
  };

  const isOffer = doc.type === "quote";

  return (
    <div style={{ minHeight: "100vh", background: "#F4F6F4", padding: "28px 12px" }}>
      <div style={{ maxWidth: 840, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18, justifyContent: "center" }}>
          <span style={{ width: 30, height: 30, borderRadius: 8, background: "#0B5E4A", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontFamily: "Georgia,serif" }}>C</span>
          <span style={{ fontWeight: 700, color: "#1A2B26", fontFamily: "Georgia,serif" }}>{PLATFORM_NAME}</span>
        </div>

        <PublicDocDecision
          token={token}
          decision={doc.clientDecision}
          docLabel={isOffer ? "офертата" : "документа"}
          from={doc.company.name}
        />

        <div className="printable" style={{ marginTop: 16 }}>
          {isOffer ? <OfferDocument data={docData} /> : <InvoiceDocument data={docData} />}
        </div>
      </div>
    </div>
  );
}
