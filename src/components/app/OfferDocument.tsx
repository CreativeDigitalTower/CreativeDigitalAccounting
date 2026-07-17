import { formatCurrency, toBGN, isDualCurrencyActive, EUR_TO_BGN, getTemplate, paymentMethodLabel, PLATFORM_NAME, PLATFORM_URL_DISPLAY } from "@/lib/constants";
import type { InvoiceData } from "@/components/app/InvoiceDocument";
import { getMessages, makeT } from "@/lib/i18n/messages";
import { normalizeLocale, intlLocale } from "@/lib/i18n/config";

/** Професионална оферта (за документи от тип „quote"). */
export function OfferDocument({ data }: { data: InvoiceData }) {
  const tpl = getTemplate(data.template);
  const lang = normalizeLocale(data.language);
  const dt = makeT(getMessages(lang));
  const L = (k: string, vars?: Record<string, string | number>) => dt(`pdf.${k}`, vars);
  const fmtDate = (d: string | Date) => new Date(d).toLocaleDateString(intlLocale(lang));
  const accent = tpl.accent;
  const dual = isDualCurrencyActive() && data.currency === "EUR";
  const subtotal = data.lines.reduce((s, l) => s + l.quantity * l.unitPrice, 0);
  const vat = data.lines.reduce((s, l) => s + l.quantity * l.unitPrice * (l.vatRate / 100), 0);
  const total = subtotal + vat;
  const c = data.company;

  return (
    <div className="glass printable" style={{ borderRadius: 14, maxWidth: 800, overflow: "hidden" }}>
      <div style={{ height: 8, background: accent }} />
      <div style={{ padding: "40px 48px" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28, gap: 16, flexWrap: "wrap" }}>
          <div>
            {data.logoUrl
              ? <img src={data.logoUrl} alt={c.name} style={{ maxHeight: 54, maxWidth: 180, objectFit: "contain", marginBottom: 8 }} />
              : <div style={{ fontFamily: "'Fraunces', serif", fontWeight: 700, fontSize: 20, color: accent, marginBottom: 6 }}>{c.name}</div>}
            <div style={{ fontSize: 12.5, color: "var(--ink-soft)", lineHeight: 1.7 }}>
              <div style={{ fontWeight: 600 }}>{c.name}</div>
              {c.mol && <div>{L("mol")}: {c.mol}</div>}
              {c.eik && <div>{L("eik")}: {c.eik}{c.vatNumber ? ` · ${L("vat")} ${c.vatNumber}` : ""}</div>}
              {c.address && <div>{c.address}{c.city ? `, ${c.city}` : ""}</div>}
              {c.phone && <div>{L("phone")}: {c.phone}</div>}
              {c.email && <div>{L("email")}: {c.email}</div>}
              {c.website && <div>{L("website")}: {c.website}</div>}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontFamily: "'Fraunces', serif", fontSize: 28, fontWeight: 700, color: accent, letterSpacing: 1 }}>{L("title.quote")}</div>
            <div className="num" style={{ fontSize: 15, color: "var(--ink-soft)" }}>№ {data.number}</div>
            <div style={{ fontSize: 12.5, color: "var(--ink-soft)", marginTop: 6, lineHeight: 1.7 }}>
              <div>{L("offer.date")}: {fmtDate(data.issueDate)}</div>
              {data.dueDate && <div style={{ fontWeight: 600 }}>{L("offer.validUntil")}: {fmtDate(data.dueDate)}</div>}
            </div>
          </div>
        </div>

        {/* До: клиент */}
        {data.client && (
          <div style={{ marginBottom: 18 }}>
            <span style={{ fontSize: 11.5, color: "var(--muted)", fontWeight: 600, letterSpacing: 1 }}>{L("offer.to")}: </span>
            <span style={{ fontWeight: 600 }}>{data.client.name}</span>
            <span style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>
              {data.client.eik ? ` · ${L("eik")} ${data.client.eik}` : ""}{data.client.address ? ` · ${data.client.address}` : ""}{data.client.city ? `, ${data.client.city}` : ""}
            </span>
          </div>
        )}

        {/* Въведение / описание */}
        <p style={{ fontSize: 13, lineHeight: 1.6, marginBottom: 6 }}>{L("offer.greeting")}</p>
        <p style={{ fontSize: 13, lineHeight: 1.6, marginBottom: 16 }}>
          {L("offer.intro")}
        </p>
        {data.notes && (
          <div style={{ fontSize: 12.5, color: "var(--ink-soft)", lineHeight: 1.6, whiteSpace: "pre-wrap", background: "rgba(255,255,255,.4)", borderLeft: `3px solid ${accent}`, padding: "12px 16px", borderRadius: 8, marginBottom: 18 }}>
            {data.notes}
          </div>
        )}

        {/* Таблица с позиции */}
        <table style={{ marginBottom: 20 }}>
          <thead>
            <tr style={{ background: accent, color: "#fff" }}>
              <th style={{ paddingLeft: 12, color: "#fff", borderBottom: "none" }}>{L("colDescription")}</th>
              <th className="num" style={{ color: "#fff", borderBottom: "none" }}>{L("colQty")}</th>
              <th className="num" style={{ color: "#fff", borderBottom: "none" }}>{L("colUnitPrice")}</th>
              <th className="num" style={{ color: "#fff", borderBottom: "none" }}>{L("colVatPct")}</th>
              <th className="num" style={{ paddingRight: 12, color: "#fff", borderBottom: "none" }}>{L("offer.colValue")}</th>
            </tr>
          </thead>
          <tbody>
            {data.lines.map((line, i) => (
              <tr key={line.id ?? i}>
                <td style={{ paddingLeft: 12 }}>{line.description}</td>
                <td className="num">{line.quantity}</td>
                <td className="num">{formatCurrency(line.unitPrice, data.currency)}</td>
                <td className="num">{line.vatRate}%</td>
                <td className="num" style={{ fontWeight: 600, paddingRight: 12 }}>{formatCurrency(line.lineTotal, data.currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Тотали */}
        <div style={{ marginLeft: "auto", width: 280 }}>
          {[{ label: L("net"), value: subtotal }, { label: L("vatTotal"), value: vat }].map((r) => (
            <div key={r.label} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "4px 0", color: "var(--ink-soft)" }}>
              <span>{r.label}</span><span className="num">{formatCurrency(r.value, data.currency)}</span>
            </div>
          ))}
          <div style={{ display: "flex", justifyContent: "space-between", borderTop: `2px solid ${accent}`, marginTop: 6, paddingTop: 10, fontSize: 18, fontWeight: 700, fontFamily: "'IBM Plex Mono', monospace", color: accent }}>
            <span>{L("grandTotal")}</span><span>{formatCurrency(total, data.currency)}</span>
          </div>
          {dual && (
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, color: "var(--muted)", fontFamily: "'IBM Plex Mono', monospace", paddingTop: 4 }}>
              <span>≈ BGN:</span><span>{formatCurrency(toBGN(total), "BGN")}</span>
            </div>
          )}
        </div>

        <div style={{ marginTop: 20, borderTop: "1px solid var(--border)", paddingTop: 14, fontSize: 12.5, color: "var(--ink-soft)", lineHeight: 1.7 }}>
          <div><strong style={{ color: accent }}>{L("offer.paymentTerms")}:</strong> {(() => { const k = dt(`enums.payment.${data.paymentMethod}`); return k.startsWith("enums.") ? paymentMethodLabel(data.paymentMethod) : k; })()}</div>
          {data.dueDate && <div><strong style={{ color: accent }}>{L("offer.validityTerm")}:</strong> {L("offer.until")} {fmtDate(data.dueDate)}</div>}
          {dual && <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 6 }}>{L("offer.fixedRate", { rate: EUR_TO_BGN })}</div>}
        </div>

        <p style={{ fontSize: 12.5, color: "var(--ink-soft)", marginTop: 16 }}>{L("offer.closing")}</p>

        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 30 }}>
          <div style={{ textAlign: "center", minWidth: 220 }}>
            <div style={{ borderTop: "1px solid var(--ink)", paddingTop: 6, fontSize: 12.5 }}>{L("offer.regards")} {c.name}</div>
          </div>
        </div>

        {/* Съставил / Получил — с имената на МОЛ-овете */}
        <div style={{ marginTop: 26, display: "flex", gap: 24, justifyContent: "space-between", fontSize: 12.5, color: "var(--ink-soft)" }}>
          <div style={{ flex: 1 }}>
            <div style={{ color: "var(--muted)", marginBottom: 24 }}>{L("preparedBy")}:</div>
            <div style={{ borderTop: "1px solid var(--border)", paddingTop: 4 }}>{c.mol || c.name}</div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ color: "var(--muted)", marginBottom: 24 }}>{L("signedRecipient")}:</div>
            <div style={{ borderTop: "1px solid var(--border)", paddingTop: 4 }}>{data.client?.mol || data.client?.name || ""}</div>
          </div>
        </div>

        <div style={{ marginTop: 22, paddingTop: 12, borderTop: "1px solid var(--border)", fontSize: 10.5, color: "var(--muted)", textAlign: "center" }}>
          {L("platformCredit", { name: PLATFORM_NAME })} ·{" "}
          <a href="https://www.creativedigitalaccounting.com" style={{ color: "inherit", textDecoration: "none" }}>{PLATFORM_URL_DISPLAY}</a>
        </div>
      </div>
    </div>
  );
}
