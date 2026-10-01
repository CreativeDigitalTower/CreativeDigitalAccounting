import type { InvoiceData } from "@/components/app/InvoiceDocument";

/**
 * Read-only проекция на стандартна фактура (Document) за логистичния cross-company изглед
 * (МК продажби). Metal Trade вижда фактурата, издадена от свързаната MK фирма (owner на
 * Document-а), БЕЗ смяна на активна фирма и БЕЗ мутации. Мапингът повтаря стандартния
 * invoice view, за да изглежда идентично, но се рендира read-only.
 */
export type MkDocForView = {
  type: string; number: string; issueDate: Date; taxEventDate: Date | null; dueDate: Date | null;
  currency: string; paymentMethod: string; notes: string | null; template: string; language: string | null;
  vatExempt: boolean; vatExemptReason: string | null; clientIsIndividual: boolean;
  company: {
    name: string; mol: string | null; address: string | null; city: string | null; eik: string | null;
    vatRegistered: boolean; vatNumber: string | null; bankIban: string | null; bankName: string | null;
    bankBic: string | null; phone: string | null; email: string | null; website: string | null; logoUrl: string | null;
  };
  client: { name: string; mol: string | null; address: string | null; city: string | null; eik: string | null; vatNumber: string | null } | null;
  lines: { id: string; description: string; quantity: number; unitPrice: number; vatRate: number; lineTotal: number }[];
};

export function buildInvoiceViewData(doc: MkDocForView, opts: { vatExemptReasonText: string | null; showLogo: boolean }): InvoiceData {
  return {
    type: doc.type, number: doc.number, issueDate: doc.issueDate, taxEventDate: doc.taxEventDate, dueDate: doc.dueDate,
    currency: doc.currency, paymentMethod: doc.paymentMethod, notes: doc.notes, template: doc.template,
    logoUrl: opts.showLogo ? doc.company.logoUrl : null,
    company: {
      name: doc.company.name, mol: doc.company.mol, address: doc.company.address, city: doc.company.city,
      eik: doc.company.eik, vatNumber: doc.company.vatRegistered ? doc.company.vatNumber : null, bankIban: doc.company.bankIban,
      bankName: doc.company.bankName, bankBic: doc.company.bankBic, phone: doc.company.phone, email: doc.company.email, website: doc.company.website,
    },
    client: doc.client ? {
      name: doc.client.name, mol: doc.client.mol, address: doc.client.address, city: doc.client.city,
      eik: doc.clientIsIndividual ? null : doc.client.eik, vatNumber: doc.clientIsIndividual ? null : doc.client.vatNumber,
    } : null,
    lines: doc.lines.map((l) => ({ id: l.id, description: l.description, quantity: l.quantity, unitPrice: l.unitPrice, vatRate: l.vatRate, lineTotal: l.lineTotal })),
    vatExempt: doc.vatExempt, vatExemptReasonText: opts.vatExemptReasonText, language: doc.language,
  };
}

/** Payment/статус ключ за read-only badge (canonical Document.status). Легаси MkInvoice няма → null. */
export function mkInvoiceStatusKey(status: string | null | undefined): string | null {
  return status ?? null;
}
