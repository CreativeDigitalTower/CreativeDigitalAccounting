import { requireCompany } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Stamp } from "@/components/Stamp";
import { DocumentActions } from "@/components/app/DocumentActions";
import { SendToClient } from "@/components/app/SendToClient";
import { InvoiceDocument } from "@/components/app/InvoiceDocument";
import { OfferDocument } from "@/components/app/OfferDocument";

export default async function DocumentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { companyId } = await requireCompany();
  const { id } = await params;

  const doc = await prisma.document.findUnique({
    where: { id },
    include: { client: true, lines: true, company: { include: { subscription: true } } },
  });

  if (!doc || doc.companyId !== companyId) notFound();

  const plan = doc.company.subscription?.plan ?? "free";
  const showLogo = plan !== "free" && !!doc.company.logoUrl; // лого във фактурата само за платени планове

  return (
    <>
      {/* Topbar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <Link href="/dashboard/documents" style={{ color: "var(--muted)", textDecoration: "none", fontSize: 13 }}>← Документи</Link>
          <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 20, fontWeight: 600, margin: 0 }}>{doc.number}</h1>
          <Stamp status={doc.status} />
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", position: "relative" }} className="no-print">
          <SendToClient id={doc.id} defaultEmail={doc.clientEmail ?? doc.client?.contactEmail} decision={doc.clientDecision} sentAt={doc.sentToClientAt?.toISOString() ?? null} />
          {doc.type === "quote" && <Link href={`/dashboard/documents/new?type=proforma&parent=${doc.id}`} className="btn btn-ghost btn-sm">→ Проформа</Link>}
          {doc.type === "proforma" && <Link href={`/dashboard/documents/new?type=invoice&parent=${doc.id}`} className="btn btn-ghost btn-sm">→ Фактура</Link>}
          <DocumentActions id={doc.id} status={doc.status} number={doc.number} />
        </div>
      </div>

      {(() => {
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
        return doc.type === "quote" ? <OfferDocument data={docData} /> : <InvoiceDocument data={docData} />;
      })()}

      {/* Вътрешен коментар — само за вашия екип, НЕ е част от документа */}
      {doc.internalComment && (
        <div className="glass no-print" style={{ maxWidth: 800, marginTop: 14, padding: "14px 18px", borderRadius: 12, borderLeft: "4px solid var(--brass)" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--brass)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Вътрешен коментар (не се вижда от клиента)</div>
          <div style={{ fontSize: 13, color: "var(--ink-soft)" }}>{doc.internalComment}</div>
        </div>
      )}
    </>
  );
}
