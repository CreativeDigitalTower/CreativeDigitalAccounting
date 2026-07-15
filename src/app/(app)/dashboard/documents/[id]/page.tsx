import { requireCompany } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { vatExemptReasonText } from "@/lib/constants";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Stamp } from "@/components/Stamp";
import { DocumentActions } from "@/components/app/DocumentActions";
import { SendToClient } from "@/components/app/SendToClient";
import { EditableDocNumber } from "@/components/app/EditableDocNumber";
import { InvoiceDocument } from "@/components/app/InvoiceDocument";
import { OfferDocument } from "@/components/app/OfferDocument";
import { InvoiceAttachments } from "@/components/app/InvoiceAttachments";
import { getT } from "@/lib/i18n/server";

export default async function DocumentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { companyId } = await requireCompany();
  const { t } = await getT();
  const { id } = await params;

  const doc = await prisma.document.findUnique({
    where: { id },
    include: {
      client: { include: { emails: { orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }] } } },
      lines: true,
      company: { include: { subscription: true } },
      attachments: { orderBy: { createdAt: "asc" }, select: { id: true, filename: true, originalFilename: true, mimeType: true, size: true, createdAt: true } },
    },
  });

  if (!doc || doc.companyId !== companyId) notFound();

  const sendPurpose = doc.type === "quote" ? "offer" : "invoice";
  const clientEmails = (doc.client?.emails ?? []).map((e) => ({
    email: e.email, contactName: e.contactName, type: e.type, isPrimary: e.isPrimary, isActive: e.isActive,
    receivesInvoices: e.receivesInvoices, receivesReminders: e.receivesReminders, receivesOffers: e.receivesOffers, receivesGeneral: e.receivesGeneral,
  }));
  const attachmentsForSend = doc.attachments.map((a) => ({ id: a.id, filename: a.filename, size: a.size }));
  const attachmentsInitial = doc.attachments.map((a) => ({ ...a, createdAt: a.createdAt.toISOString() }));

  const plan = doc.company.subscription?.plan ?? "free";
  const showLogo = plan !== "free" && !!doc.company.logoUrl; // лого във фактурата само за платени планове

  return (
    <>
      {/* Topbar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <Link href="/dashboard/documents" style={{ color: "var(--muted)", textDecoration: "none", fontSize: 13 }}>{t("documents.detail.back")}</Link>
          <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 20, fontWeight: 600, margin: 0 }}>
            <EditableDocNumber id={doc.id} initial={doc.number} />
          </h1>
          <Stamp status={doc.status} label={t(`documents.stamp.${doc.status}`)} />
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", position: "relative" }} className="no-print">
          <SendToClient id={doc.id} defaultEmail={doc.clientEmail ?? doc.client?.contactEmail} decision={doc.clientDecision} sentAt={doc.sentToClientAt?.toISOString() ?? null} purpose={sendPurpose} clientEmails={clientEmails} attachments={attachmentsForSend} />
          {doc.type === "quote" && <Link href={`/dashboard/documents/new?type=proforma&parent=${doc.id}`} className="btn btn-ghost btn-sm">{t("documents.detail.toProforma")}</Link>}
          {doc.type === "proforma" && <Link href={`/dashboard/documents/new?type=invoice&parent=${doc.id}`} className="btn btn-ghost btn-sm">{t("documents.detail.toInvoice")}</Link>}
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
            eik: doc.company.eik, vatNumber: doc.company.vatRegistered ? doc.company.vatNumber : null, bankIban: doc.company.bankIban,
            bankName: doc.company.bankName, bankBic: doc.company.bankBic,
            phone: doc.company.phone, email: doc.company.email, website: doc.company.website,
          },
          client: doc.client ? {
            name: doc.client.name, mol: doc.client.mol, address: doc.client.address, city: doc.client.city,
            eik: doc.clientIsIndividual ? null : doc.client.eik, vatNumber: doc.clientIsIndividual ? null : doc.client.vatNumber,
          } : null,
          lines: doc.lines.map((l) => ({ id: l.id, description: l.description, quantity: l.quantity, unitPrice: l.unitPrice, vatRate: l.vatRate, lineTotal: l.lineTotal })),
          vatExempt: doc.vatExempt, vatExemptReasonText: vatExemptReasonText(doc.vatExemptReason), language: doc.language,
        };
        return doc.type === "quote" ? <OfferDocument data={docData} /> : <InvoiceDocument data={docData} />;
      })()}

      {/* Приложени файлове — извън документа, не влияят на стойности/номерация */}
      <div className="no-print" style={{ maxWidth: 800, marginTop: 16 }}>
        <InvoiceAttachments documentId={doc.id} initial={attachmentsInitial} />
      </div>

      {/* Вътрешен коментар — само за вашия екип, НЕ е част от документа */}
      {doc.internalComment && (
        <div className="glass no-print" style={{ maxWidth: 800, marginTop: 14, padding: "14px 18px", borderRadius: 12, borderLeft: "4px solid var(--brass)" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--brass)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>{t("documents.detail.internalTitle")}</div>
          <div style={{ fontSize: 13, color: "var(--ink-soft)" }}>{doc.internalComment}</div>
        </div>
      )}
    </>
  );
}
