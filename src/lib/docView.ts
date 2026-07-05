import { vatExemptReasonText } from "@/lib/constants";
import type { Prisma } from "@prisma/client";

type DocWithRelations = Prisma.DocumentGetPayload<{
  include: { client: true; lines: true; company: { include: { subscription: true } } };
}>;

/** Преобразува документ (с client/lines/company) в данните за InvoiceDocument/OfferDocument. */
export function toDocData(doc: DocWithRelations) {
  const plan = doc.company.subscription?.plan ?? "free";
  const showLogo = plan !== "free" && !!doc.company.logoUrl;
  return {
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
    vatExempt: doc.vatExempt, vatExemptReasonText: vatExemptReasonText(doc.vatExemptReason),
    lines: doc.lines.map((l) => ({ id: l.id, description: l.description, quantity: l.quantity, unitPrice: l.unitPrice, vatRate: l.vatRate, lineTotal: l.lineTotal })),
  };
}
