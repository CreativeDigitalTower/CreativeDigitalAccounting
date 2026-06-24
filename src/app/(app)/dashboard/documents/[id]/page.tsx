import { requireCompany } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Stamp } from "@/components/Stamp";
import { DocumentActions } from "@/components/app/DocumentActions";
import { formatCurrency, toBGN, isDualCurrencyActive, EUR_TO_BGN, getTemplate, paymentMethodLabel } from "@/lib/constants";

const TYPE_LABELS: Record<string, string> = {
  invoice: "ФАКТУРА",
  proforma: "ПРОФОРМА ФАКТУРА",
  quote: "ОФЕРТА",
  credit_note: "КРЕДИТНО ИЗВЕСТИЕ",
  debit_note: "ДЕБИТНО ИЗВЕСТИЕ",
};

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

  const dual = isDualCurrencyActive() && doc.currency === "EUR";
  const subtotal = doc.lines.reduce((s, l) => s + l.quantity * l.unitPrice, 0);
  const vat = doc.lines.reduce((s, l) => s + l.quantity * l.unitPrice * (l.vatRate / 100), 0);
  const total = subtotal + vat;
  const tpl = getTemplate(doc.template);
  const accent = tpl.accent;
  const isBand = tpl.layout === "band";
  const isMinimal = tpl.layout === "minimal";

  return (
    <>
      {/* Topbar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <Link href="/dashboard/documents" style={{ color: "var(--muted)", textDecoration: "none", fontSize: 13 }}>← Документи</Link>
          <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 20, fontWeight: 600, margin: 0 }}>{doc.number}</h1>
          <Stamp status={doc.status} />
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }} className="no-print">
          {doc.type === "quote" && <Link href={`/dashboard/documents/new?type=proforma&parent=${doc.id}`} className="btn btn-ghost btn-sm">→ Проформа</Link>}
          {doc.type === "proforma" && <Link href={`/dashboard/documents/new?type=invoice&parent=${doc.id}`} className="btn btn-ghost btn-sm">→ Фактура</Link>}
          <DocumentActions id={doc.id} status={doc.status} />
        </div>
      </div>

      {/* Document */}
      <div className="glass printable" style={{ borderRadius: 14, maxWidth: 800, overflow: "hidden" }}>
        {isBand && <div style={{ height: 10, background: accent }} />}
        <div style={{ padding: "40px 48px" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 36, flexWrap: "wrap", gap: 16 }}>
          <div>
            {showLogo
              ? <img src={doc.company.logoUrl!} alt={doc.company.name} style={{ maxHeight: 56, maxWidth: 180, objectFit: "contain", marginBottom: 8 }} />
              : <div style={{ fontFamily: "'Fraunces', serif", fontWeight: 700, fontSize: 20, color: accent, marginBottom: 6 }}>{doc.company.name}</div>}
            <div style={{ fontSize: 12.5, color: "var(--ink-soft)", lineHeight: 1.7 }}>
              <div style={{ fontWeight: 600 }}>{doc.company.name}</div>
              {doc.company.mol && <div>МОЛ: {doc.company.mol}</div>}
              {doc.company.address && <div>{doc.company.address}</div>}
              {doc.company.city && <div>{doc.company.city}</div>}
              {doc.company.eik && <div>ЕИК: {doc.company.eik}</div>}
              {doc.company.vatNumber && <div>ДДС №: {doc.company.vatNumber}</div>}
              {doc.company.bankIban && <div>IBAN: {doc.company.bankIban}</div>}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 700, marginBottom: 4, color: accent }}>
              {TYPE_LABELS[doc.type] ?? doc.type.toUpperCase()}
            </div>
            <div className="num" style={{ fontSize: 16, color: "var(--ink-soft)", marginBottom: 12 }}>№ {doc.number}</div>
            <div style={{ fontSize: 12.5, color: "var(--ink-soft)", lineHeight: 1.8 }}>
              <div>Дата на издаване: {new Date(doc.issueDate).toLocaleDateString("bg-BG")}</div>
              {doc.taxEventDate && <div>Дата на данъчно събитие: {new Date(doc.taxEventDate).toLocaleDateString("bg-BG")}</div>}
              {doc.dueDate && <div>Срок за плащане: {new Date(doc.dueDate).toLocaleDateString("bg-BG")}</div>}
            </div>
          </div>
        </div>

        {/* Client */}
        {doc.client && (
          <div style={{ background: "rgba(255,255,255,.4)", borderRadius: 10, padding: "14px 18px", marginBottom: 28 }}>
            <div style={{ fontSize: 11.5, color: "var(--muted)", fontWeight: 600, letterSpacing: 1, marginBottom: 6 }}>ПОЛУЧАТЕЛ</div>
            <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>{doc.client.name}</div>
            <div style={{ fontSize: 12.5, color: "var(--ink-soft)", lineHeight: 1.7 }}>
              {doc.client.address && <div>{doc.client.address}</div>}
              {doc.client.city && <div>{doc.client.city}</div>}
              {doc.client.eik && <div>ЕИК: {doc.client.eik}</div>}
              {doc.client.vatNumber && <div>ДДС №: {doc.client.vatNumber}</div>}
            </div>
          </div>
        )}

        {/* Lines */}
        <table style={{ marginBottom: 24 }}>
          <thead>
            <tr>
              <th style={{ paddingLeft: 0 }}>Описание</th>
              <th className="num">Кол.</th>
              <th className="num">Ед. цена</th>
              <th className="num">ДДС %</th>
              <th className="num">Сума</th>
            </tr>
          </thead>
          <tbody>
            {doc.lines.map((line, i) => (
              <tr key={line.id}>
                <td style={{ paddingLeft: 0 }}>{line.description}</td>
                <td className="num">{line.quantity}</td>
                <td className="num">{formatCurrency(line.unitPrice, doc.currency)}</td>
                <td className="num">{line.vatRate}%</td>
                <td className="num" style={{ fontWeight: 600 }}>{formatCurrency(line.lineTotal, doc.currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div style={{ marginLeft: "auto", width: 280 }}>
          {[
            { label: "Нето:", value: subtotal },
            { label: "ДДС:", value: vat },
          ].map((r) => (
            <div key={r.label} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "4px 0", color: "var(--ink-soft)" }}>
              <span>{r.label}</span><span className="num">{formatCurrency(r.value, doc.currency)}</span>
            </div>
          ))}
          <div style={{ display: "flex", justifyContent: "space-between", borderTop: `2px solid ${accent}`, marginTop: 6, paddingTop: 10, fontSize: 18, fontWeight: 700, fontFamily: "'IBM Plex Mono', monospace", color: isMinimal ? "var(--ink)" : accent }}>
            <span>ОБЩО:</span><span>{formatCurrency(total, doc.currency)}</span>
          </div>
          {dual && (
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, color: "var(--muted)", fontFamily: "'IBM Plex Mono', monospace", paddingTop: 4 }}>
              <span>≈ BGN:</span><span>{formatCurrency(toBGN(total), "BGN")}</span>
            </div>
          )}
        </div>

        {dual && (
          <p style={{ fontSize: 11, color: "var(--muted)", marginTop: 20, borderTop: "1px solid var(--border)", paddingTop: 12 }}>
            Двойно EUR/BGN обозначаване съгласно чл. 32 от Закона за въвеждане на еврото.
            Фиксиран курс: 1 EUR = {EUR_TO_BGN} лв (BGN). Валидно до 08.08.2026 г.
          </p>
        )}

        {/* Начин на плащане */}
        <div style={{ marginTop: 20, borderTop: "1px solid var(--border)", paddingTop: 14, fontSize: 12.5, color: "var(--ink-soft)" }}>
          <strong style={{ color: accent }}>Начин на плащане:</strong> {paymentMethodLabel(doc.paymentMethod)}
          {doc.paymentMethod === "bank_transfer" && doc.company.bankIban && (
            <div style={{ marginTop: 8, lineHeight: 1.7 }}>
              <div>Получател: <strong>{doc.company.name}</strong></div>
              <div>IBAN: <span className="num">{doc.company.bankIban}</span></div>
              {doc.company.bankName && <div>Банка: {doc.company.bankName}</div>}
              {doc.company.bankBic && <div>BIC: {doc.company.bankBic}</div>}
              <div>Основание: {doc.number}</div>
            </div>
          )}
        </div>

        {doc.notes && (
          <div style={{ marginTop: 16, fontSize: 12.5, color: "var(--ink-soft)", borderTop: "1px solid var(--border)", paddingTop: 12 }}>
            <strong>Забележки:</strong> {doc.notes}
          </div>
        )}
        </div>
      </div>

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
