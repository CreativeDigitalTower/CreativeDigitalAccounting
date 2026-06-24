import Link from "next/link";
import { InvoiceDocument } from "@/components/app/InvoiceDocument";
import { INVOICE_TEMPLATES, getTemplate } from "@/lib/constants";

export default async function TemplatePreviewPage({ searchParams }: { searchParams: Promise<{ template?: string }> }) {
  const { template } = await searchParams;
  const tpl = getTemplate(template);

  const sample = {
    type: "invoice", number: "0000000123", issueDate: new Date(), taxEventDate: new Date(),
    dueDate: new Date(Date.now() + 30 * 864e5), currency: "EUR", paymentMethod: "bank_transfer",
    notes: "Благодарим Ви за доверието! Плащане в 30-дневен срок.", template: tpl.id, logoUrl: null,
    company: {
      name: "Вашата Фирма ЕООД", mol: "Иван Иванов", address: "ул. Примерна 12", city: "София 1000",
      eik: "201234567", vatNumber: "BG201234567", bankIban: "BG80BNBG96611020345678", bankName: "Примерна Банка", bankBic: "EXMPBGSF",
    },
    client: {
      name: "Клиент ООД", mol: "Петър Петров", address: "бул. Клиентски 88", city: "Пловдив 4000",
      eik: "207654321", vatNumber: "BG207654321",
    },
    lines: [
      { description: "Консултантска услуга — месечен абонамент", quantity: 1, unitPrice: 500, vatRate: 20, lineTotal: 600 },
      { description: "Допълнителна разработка (часове)", quantity: 8, unitPrice: 45, vatRate: 20, lineTotal: 432 },
      { description: "Хостинг и поддръжка", quantity: 1, unitPrice: 75, vatRate: 20, lineTotal: 90 },
    ],
  };

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20, flexWrap: "wrap" }}>
        <Link href="/dashboard/settings" style={{ color: "var(--muted)", textDecoration: "none", fontSize: 13 }}>← Профил на фирмата</Link>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 20, fontWeight: 600, margin: 0 }}>Преглед на шаблон: {tpl.name}</h1>
      </div>

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 20 }}>
        {INVOICE_TEMPLATES.map((t) => (
          <Link key={t.id} href={`/dashboard/settings/preview?template=${t.id}`} className={`filter-tab${t.id === tpl.id ? " active" : ""}`}>
            {t.name}
          </Link>
        ))}
      </div>

      <p style={{ fontSize: 12.5, color: "var(--muted)", marginBottom: 14 }}>
        Това е примерна фактура с примерни данни. За да приложите този шаблон, изберете го в <Link href="/dashboard/settings" style={{ color: "var(--navy)" }}>Профил на фирмата</Link>.
      </p>

      <InvoiceDocument data={sample} />
    </>
  );
}
