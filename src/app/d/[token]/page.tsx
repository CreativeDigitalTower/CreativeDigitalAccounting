import { prisma } from "@/lib/prisma";
import { vatExemptReasonText } from "@/lib/constants";
import { notFound } from "next/navigation";
import { InvoiceDocument } from "@/components/app/InvoiceDocument";
import { OfferDocument } from "@/components/app/OfferDocument";
import { PublicDocDecision } from "@/components/app/PublicDocDecision";
import { PLATFORM_NAME } from "@/lib/constants";
import { normalizeLocale } from "@/lib/i18n/config";
import { getMessages, makeT } from "@/lib/i18n/messages";

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
      eik: doc.company.eik, vatNumber: doc.company.vatRegistered ? doc.company.vatNumber : null, bankIban: doc.company.bankIban,
      bankName: doc.company.bankName, bankBic: doc.company.bankBic,
            phone: doc.company.phone, email: doc.company.email, website: doc.company.website,
    },
    client: doc.client ? {
      name: doc.client.name, mol: doc.client.mol, address: doc.client.address, city: doc.client.city,
      eik: doc.clientIsIndividual ? null : doc.client.eik, vatNumber: doc.clientIsIndividual ? null : doc.client.vatNumber,
    } : null,
    vatExempt: doc.vatExempt, vatExemptReasonText: vatExemptReasonText(doc.vatExemptReason), language: doc.language,
    lines: doc.lines.map((l) => ({ id: l.id, description: l.description, quantity: l.quantity, unitPrice: l.unitPrice, vatRate: l.vatRate, lineTotal: l.lineTotal })),
  };

  const isOffer = doc.type === "quote";

  // Публичният документ се показва на езика на самия документ (не на зрителя).
  const t = makeT(getMessages(normalizeLocale(doc.language)));
  const docLabel = t(isOffer ? "publicdoc.docLabelOffer" : "publicdoc.docLabelDoc");
  const decisionLabels = {
    sentReview: t("publicdoc.sentReview"),
    accepted: t("publicdoc.accepted", { label: docLabel }),
    rejected: t("publicdoc.rejected", { label: docLabel }),
    accept: t("publicdoc.accept"),
    reject: t("publicdoc.reject"),
    download: t("publicdoc.downloadPdf"),
  };

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
          from={doc.company.name}
          labels={decisionLabels}
        />

        <div className="printable" style={{ marginTop: 16 }}>
          {isOffer ? <OfferDocument data={docData} /> : <InvoiceDocument data={docData} />}
        </div>

        {/* Покана за присъединяване към платформата */}
        <div className="no-print" style={{ marginTop: 18, background: "#fff", border: "1px solid #E7ECE9", borderRadius: 14, padding: "22px 26px", textAlign: "center" }}>
          <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 18, color: "#1A2B26", marginBottom: 6 }}>
            {t("publicdoc.ctaTitle")}
          </div>
          <div style={{ fontSize: 13.5, color: "#384842", maxWidth: 460, margin: "0 auto 14px", lineHeight: 1.6 }}>
            {t("publicdoc.ctaText", { name: PLATFORM_NAME })}
          </div>
          <a href="/register?ref=invoice_portal" style={{ display: "inline-block", padding: "12px 28px", borderRadius: 10, background: "#0F8A6A", color: "#fff", fontWeight: 700, textDecoration: "none", fontSize: 14 }}>
            {t("publicdoc.ctaButton")}
          </a>
        </div>
      </div>
    </div>
  );
}
