import { formatCurrency, toBGN, isDualCurrencyActive, EUR_TO_BGN, getTemplate, paymentMethodLabel, PLATFORM_NAME, PLATFORM_URL_DISPLAY } from "@/lib/constants";
import { getMessages, makeT } from "@/lib/i18n/messages";
import { normalizeLocale, intlLocale } from "@/lib/i18n/config";

export type InvoiceParty = {
  name: string; mol?: string | null; address?: string | null; city?: string | null;
  eik?: string | null; vatNumber?: string | null;
  bankIban?: string | null; bankName?: string | null; bankBic?: string | null;
  phone?: string | null; email?: string | null; website?: string | null;
};
export type InvoiceLineData = { id?: string; description: string; quantity: number; unitPrice: number; vatRate: number; lineTotal: number };
export type InvoiceData = {
  type: string; number: string; issueDate: string | Date; taxEventDate?: string | Date | null; dueDate?: string | Date | null;
  currency: string; paymentMethod: string; notes?: string | null; template: string;
  company: InvoiceParty; client?: InvoiceParty | null; lines: InvoiceLineData[]; logoUrl?: string | null;
  vatExempt?: boolean; vatExemptReasonText?: string | null; language?: string | null;
};

export function InvoiceDocument({ data }: { data: InvoiceData }) {
  const tpl = getTemplate(data.template);
  const lang = normalizeLocale(data.language);
  const dt = makeT(getMessages(lang));
  const L = (k: string, vars?: Record<string, string | number>) => dt(`pdf.${k}`, vars);
  const fmtDate = (d: string | Date) => new Date(d).toLocaleDateString(intlLocale(lang));
  const accent = tpl.accent;
  const layout = tpl.layout as string;
  const dual = isDualCurrencyActive() && data.currency === "EUR";
  const subtotal = data.lines.reduce((s, l) => s + l.quantity * l.unitPrice, 0);
  const vat = data.lines.reduce((s, l) => s + l.quantity * l.unitPrice * (l.vatRate / 100), 0);
  const total = subtotal + vat;
  const title = L(`title.${data.type}`);
  const filledHead = ["band", "split", "boxed", "gradient", "letterhead", "cards"].includes(layout);
  const borderedClient = layout === "boxed" || layout === "cards";
  const serif = "'Fraunces', serif";

  const company = data.company;
  const senderLines = (
    <div style={{ fontSize: 12.5, color: "var(--ink-soft)", lineHeight: 1.7 }}>
      <div style={{ fontWeight: 600 }}>{company.name}</div>
      {company.mol && <div>{L("mol")}: {company.mol}</div>}
      {company.address && <div>{company.address}</div>}
      {company.city && <div>{company.city}</div>}
      {company.eik && <div>{L("eik")}: {company.eik}</div>}
      {company.vatNumber && <div>{L("vatNo")}: {company.vatNumber}</div>}
      {company.phone && <div>{L("phone")}: {company.phone}</div>}
      {company.email && <div>{L("email")}: {company.email}</div>}
      {company.website && <div>{L("website")}: {company.website}</div>}
    </div>
  );
  const logoOrName = data.logoUrl
    ? <img src={data.logoUrl} alt={company.name} style={{ maxHeight: 56, maxWidth: 180, objectFit: "contain", marginBottom: 8 }} />
    : <div style={{ fontFamily: serif, fontWeight: 700, fontSize: 20, color: accent, marginBottom: 6 }}>{company.name}</div>;

  const meta = (align: "left" | "right" | "center") => (
    <div style={{ textAlign: align }}>
      <div style={{ fontFamily: serif, fontSize: 22, fontWeight: 700, marginBottom: 4, color: accent }}>{title}</div>
      <div className="num" style={{ fontSize: 16, color: "var(--ink-soft)", marginBottom: 6 }}>№ {data.number}</div>
      {data.type === "invoice" && (
        <div style={{ display: "inline-block", border: `1.5px solid ${accent}`, color: accent, fontSize: 11, fontWeight: 700, letterSpacing: 1.5, padding: "2px 10px", borderRadius: 4, marginBottom: 12 }}>{L("original")}</div>
      )}
      <div style={{ fontSize: 12.5, color: "var(--ink-soft)", lineHeight: 1.8 }}>
        <div>{L("issueDate")}: {fmtDate(data.issueDate)}</div>
        {data.taxEventDate && <div>{L("taxEventDate")}: {fmtDate(data.taxEventDate)}</div>}
        {data.dueDate && <div>{L("paymentDue")}: {fmtDate(data.dueDate)}</div>}
      </div>
    </div>
  );

  const clientBox = data.client && (
    <div style={{ background: borderedClient ? "transparent" : "rgba(255,255,255,.4)", border: borderedClient ? `1px solid ${accent}` : undefined, borderRadius: 10, padding: "14px 18px", marginBottom: 28 }}>
      <div style={{ fontSize: 11.5, color: borderedClient ? accent : "var(--muted)", fontWeight: 600, letterSpacing: 1, marginBottom: 6 }}>{L("recipient")}</div>
      <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>{data.client.name}</div>
      <div style={{ fontSize: 12.5, color: "var(--ink-soft)", lineHeight: 1.7 }}>
        {data.client.mol && <div>{L("mol")}: {data.client.mol}</div>}
        {data.client.address && <div>{data.client.address}</div>}
        {data.client.city && <div>{data.client.city}</div>}
        {data.client.eik && <div>{L("eik")}: {data.client.eik}</div>}
        {data.client.vatNumber && <div>{L("vatNo")}: {data.client.vatNumber}</div>}
      </div>
    </div>
  );

  // ---- Header variants ----
  let header: React.ReactNode;
  if (layout === "centered") {
    header = (
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}>{logoOrName}</div>
        <div style={{ fontFamily: serif, fontSize: 30, fontWeight: 700, color: accent, letterSpacing: 2, margin: "6px 0" }}>{title}</div>
        <div className="num" style={{ fontSize: 14, color: "var(--ink-soft)" }}>№ {data.number}</div>
        {data.type === "invoice" && <div style={{ display: "inline-block", border: `1.5px solid ${accent}`, color: accent, fontSize: 10.5, fontWeight: 700, letterSpacing: 1.5, padding: "2px 10px", borderRadius: 4, margin: "8px 0" }}>{L("original")}</div>}
        <div style={{ display: "flex", justifyContent: "center", gap: 18, fontSize: 12, color: "var(--ink-soft)", marginTop: 6, flexWrap: "wrap" }}>
          <span>{L("issuedShort")}: {fmtDate(data.issueDate)}</span>
          {data.taxEventDate && <span>{L("taxEventShort")}: {fmtDate(data.taxEventDate)}</span>}
          {data.dueDate && <span>{L("dueDate")}: {fmtDate(data.dueDate)}</span>}
        </div>
        <div style={{ borderTop: `2px solid ${accent}`, margin: "20px auto 0", maxWidth: 220 }} />
        <div style={{ marginTop: 18, textAlign: "left" }}>{senderLines}</div>
      </div>
    );
  } else if (layout === "boxed") {
    header = (
      <>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, gap: 16, flexWrap: "wrap" }}>
          <div>{logoOrName}</div>
          {meta("right")}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 0, marginBottom: 24 }}>
          <div style={{ border: `1px solid ${accent}`, borderRadius: 10, padding: "14px 18px" }}>
            <div style={{ fontSize: 11.5, color: accent, fontWeight: 600, letterSpacing: 1, marginBottom: 6 }}>{L("supplier")}</div>
            {senderLines}
          </div>
        </div>
      </>
    );
  } else if (layout === "split") {
    header = (
      <div style={{ margin: "-40px -48px 28px", padding: "32px 48px", background: accent, color: "rgba(255,255,255,.95)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontFamily: serif, fontWeight: 700, fontSize: 20, marginBottom: 8 }}>{company.name}</div>
            <div style={{ fontSize: 12.5, lineHeight: 1.7, opacity: .92 }}>
              {company.mol && <div>{L("mol")}: {company.mol}</div>}
              {company.address && <div>{company.address}{company.city ? `, ${company.city}` : ""}</div>}
              {company.eik && <div>{L("eik")}: {company.eik}</div>}
              {company.vatNumber && <div>{L("vatNo")}: {company.vatNumber}</div>}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontFamily: serif, fontSize: 26, fontWeight: 700, letterSpacing: 1 }}>{title}</div>
            <div className="num" style={{ fontSize: 15, opacity: .92 }}>№ {data.number}</div>
            {data.type === "invoice" && <div style={{ display: "inline-block", border: "1.5px solid rgba(255,255,255,.8)", fontSize: 10.5, fontWeight: 700, letterSpacing: 1.5, padding: "2px 10px", borderRadius: 4, marginTop: 8 }}>{L("original")}</div>}
            <div style={{ fontSize: 12, opacity: .92, marginTop: 8, lineHeight: 1.7 }}>
              <div>{L("issuedShort")}: {fmtDate(data.issueDate)}</div>
              {data.dueDate && <div>{L("dueDate")}: {fmtDate(data.dueDate)}</div>}
            </div>
          </div>
        </div>
      </div>
    );
  } else if (layout === "minimal") {
    header = (
      <div style={{ marginBottom: 30 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", borderBottom: "1px solid var(--border)", paddingBottom: 14 }}>
          <div style={{ fontFamily: serif, fontWeight: 700, fontSize: 17 }}>{company.name}</div>
          <div style={{ fontSize: 13, letterSpacing: 3, color: "var(--ink)", fontWeight: 600 }}>{title} · № {data.number}</div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 14, flexWrap: "wrap", gap: 16 }}>
          {senderLines}
          <div style={{ fontSize: 12, color: "var(--ink-soft)", textAlign: "right", lineHeight: 1.8 }}>
            <div>{L("issuedShort")}: {fmtDate(data.issueDate)}</div>
            {data.taxEventDate && <div>{L("taxEventShort")}: {fmtDate(data.taxEventDate)}</div>}
            {data.dueDate && <div>{L("dueDate")}: {fmtDate(data.dueDate)}</div>}
          </div>
        </div>
      </div>
    );
  } else if (layout === "gradient") {
    header = (
      <div style={{ margin: "-40px -48px 28px", padding: "34px 48px 30px", background: `linear-gradient(120deg, ${accent}, ${accent}cc 55%, ${accent}88)`, color: "#fff", borderRadius: "0 0 24px 24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontFamily: serif, fontWeight: 700, fontSize: 22 }}>{company.name}</div>
            <div style={{ fontSize: 12.5, lineHeight: 1.7, opacity: .92, marginTop: 6 }}>
              {company.eik && <div>{L("eik")}: {company.eik}{company.vatNumber ? ` · ${L("vat")} ${company.vatNumber}` : ""}</div>}
              {company.address && <div>{company.address}{company.city ? `, ${company.city}` : ""}</div>}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontFamily: serif, fontSize: 30, fontWeight: 700, letterSpacing: 1 }}>{title}</div>
            <div className="num" style={{ fontSize: 15, opacity: .95 }}>№ {data.number}</div>
            {data.type === "invoice" && <div style={{ display: "inline-block", background: "rgba(255,255,255,.18)", fontSize: 10.5, fontWeight: 700, letterSpacing: 1.5, padding: "2px 10px", borderRadius: 20, marginTop: 8 }}>{L("original")}</div>}
            <div style={{ fontSize: 12, opacity: .92, marginTop: 8, lineHeight: 1.7 }}>
              <div>{L("issuedShort")}: {fmtDate(data.issueDate)}</div>
              {data.dueDate && <div>{L("dueDate")}: {fmtDate(data.dueDate)}</div>}
            </div>
          </div>
        </div>
      </div>
    );
  } else if (layout === "letterhead") {
    header = (
      <div style={{ marginBottom: 28 }}>
        <div style={{ margin: "-40px -48px 24px", padding: "26px 48px", background: accent, color: "#fff", textAlign: "center" }}>
          <div style={{ fontFamily: serif, fontWeight: 700, fontSize: 22, letterSpacing: .5 }}>{company.name}</div>
          <div style={{ fontSize: 12, opacity: .9, marginTop: 4 }}>
            {[company.address, company.city].filter(Boolean).join(", ")}{company.eik ? ` · ${L("eik")} ${company.eik}` : ""}{company.vatNumber ? ` · ${L("vat")} ${company.vatNumber}` : ""}
          </div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontFamily: serif, fontSize: 24, fontWeight: 700, color: accent, letterSpacing: 2 }}>{title}</div>
          <div className="num" style={{ fontSize: 14, color: "var(--ink-soft)", marginTop: 2 }}>№ {data.number}</div>
          {data.type === "invoice" && <div style={{ display: "inline-block", border: `1.5px solid ${accent}`, color: accent, fontSize: 10.5, fontWeight: 700, letterSpacing: 1.5, padding: "2px 10px", borderRadius: 4, margin: "8px 0" }}>{L("original")}</div>}
          <div style={{ display: "flex", justifyContent: "center", gap: 18, fontSize: 12, color: "var(--ink-soft)", marginTop: 4, flexWrap: "wrap" }}>
            <span>{L("issuedShort")}: {fmtDate(data.issueDate)}</span>
            {data.taxEventDate && <span>{L("taxEventShort")}: {fmtDate(data.taxEventDate)}</span>}
            {data.dueDate && <span>{L("dueDate")}: {fmtDate(data.dueDate)}</span>}
          </div>
        </div>
      </div>
    );
  } else if (layout === "typewriter") {
    header = (
      <div style={{ marginBottom: 28, fontFamily: "'IBM Plex Mono', monospace" }}>
        <div style={{ borderTop: "3px solid var(--ink)", borderBottom: "1px solid var(--ink)", padding: "10px 0", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
          <div style={{ fontWeight: 700, fontSize: 15, textTransform: "uppercase", letterSpacing: 1 }}>{company.name}</div>
          <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 2 }}>{title} № {data.number}</div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12, flexWrap: "wrap", gap: 16, fontSize: 12, lineHeight: 1.7 }}>
          <div style={{ color: "var(--ink-soft)" }}>
            {company.eik && <div>{L("eik")}: {company.eik}</div>}
            {company.vatNumber && <div>{L("vatNo")}: {company.vatNumber}</div>}
            {company.address && <div>{company.address}{company.city ? `, ${company.city}` : ""}</div>}
          </div>
          <div style={{ textAlign: "right", color: "var(--ink-soft)" }}>
            <div>{L("issuedUpper")}: {fmtDate(data.issueDate)}</div>
            {data.dueDate && <div>{L("dueUpper")}: {fmtDate(data.dueDate)}</div>}
            {data.type === "invoice" && <div style={{ marginTop: 4, fontWeight: 700, color: "var(--ink)" }}>[ {L("original")} ]</div>}
          </div>
        </div>
      </div>
    );
  } else if (layout === "cards") {
    header = (
      <>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18, gap: 16, flexWrap: "wrap" }}>
          <div>{logoOrName}</div>
          {meta("right")}
        </div>
        <div style={{ border: `1px solid ${accent}`, borderRadius: 10, padding: "14px 18px", marginBottom: 14 }}>
          <div style={{ fontSize: 11.5, color: accent, fontWeight: 600, letterSpacing: 1, marginBottom: 6 }}>{L("supplier")}</div>
          {senderLines}
        </div>
      </>
    );
  } else {
    // classic & band share this header (band has top color strip rendered by wrapper)
    header = (
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 36, flexWrap: "wrap", gap: 16 }}>
        <div>{logoOrName}{senderLines}</div>
        {meta("right")}
      </div>
    );
  }

  const tableHeadStyle: React.CSSProperties = filledHead
    ? { background: accent, color: "#fff" }
    : {};
  const thStyle: React.CSSProperties = filledHead ? { color: "#fff", borderBottom: "none" } : { borderBottom: `2px solid ${accent}` };

  const body = (
    <>
      {clientBox}

      <table style={{ marginBottom: 24 }}>
        <thead>
          <tr style={tableHeadStyle}>
            <th style={{ paddingLeft: filledHead ? 12 : 0, ...thStyle }}>{L("colDescription")}</th>
            <th className="num" style={thStyle}>{L("colQty")}</th>
            <th className="num" style={thStyle}>{L("colUnitPrice")}</th>
            <th className="num" style={thStyle}>{L("colVatPct")}</th>
            <th className="num" style={{ paddingRight: filledHead ? 12 : undefined, ...thStyle }}>{L("colAmount")}</th>
          </tr>
        </thead>
        <tbody>
          {data.lines.map((line, i) => (
            <tr key={line.id ?? i}>
              <td style={{ paddingLeft: filledHead ? 12 : 0 }}>{line.description}</td>
              <td className="num">{line.quantity}</td>
              <td className="num">{formatCurrency(line.unitPrice, data.currency)}</td>
              <td className="num">{line.vatRate}%</td>
              <td className="num" style={{ fontWeight: 600, paddingRight: filledHead ? 12 : undefined }}>{formatCurrency(line.lineTotal, data.currency)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ marginLeft: "auto", width: 280 }}>
        {[{ label: L("net"), value: subtotal }, { label: L("vatTotal"), value: vat }].map((r) => (
          <div key={r.label} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "4px 0", color: "var(--ink-soft)" }}>
            <span>{r.label}</span><span className="num">{formatCurrency(r.value, data.currency)}</span>
          </div>
        ))}
        <div style={{ display: "flex", justifyContent: "space-between", borderTop: `2px solid ${accent}`, marginTop: 6, paddingTop: 10, fontSize: 18, fontWeight: 700, fontFamily: "'IBM Plex Mono', monospace", color: layout === "minimal" ? "var(--ink)" : accent }}>
          <span>{L("grandTotal")}</span><span>{formatCurrency(total, data.currency)}</span>
        </div>
        {dual && (
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, color: "var(--muted)", fontFamily: "'IBM Plex Mono', monospace", paddingTop: 4 }}>
            <span>≈ BGN:</span><span>{formatCurrency(toBGN(total), "BGN")}</span>
          </div>
        )}
      </div>

      {dual && (
        <p style={{ fontSize: 11, color: "var(--muted)", marginTop: 20, borderTop: "1px solid var(--border)", paddingTop: 12 }}>
          {L("dualNote", { rate: EUR_TO_BGN })}
        </p>
      )}

      {/* Основанието за неначисляване се показва САМО ако реално няма начислено ДДС */}
      {vat <= 0.005 && data.vatExempt && data.vatExemptReasonText && (
        <div style={{ marginTop: 14, fontSize: 12, color: "var(--ink-soft)", fontStyle: "italic" }}>
          <strong style={{ color: accent, fontStyle: "normal" }}>{L("vatExemptReason")}:</strong> {data.vatExemptReasonText}
        </div>
      )}

      <div style={{ marginTop: 16, borderTop: "1px solid var(--border)", paddingTop: 14, fontSize: 12.5, color: "var(--ink-soft)" }}>
        <strong style={{ color: accent }}>{L("paymentMethod")}:</strong> {paymentMethodLabel(data.paymentMethod)}
        {data.paymentMethod === "bank_transfer" && company.bankIban && (
          <div style={{ marginTop: 8, lineHeight: 1.7 }}>
            <div>{L("recipientLabel")}: <strong>{company.name}</strong></div>
            <div>IBAN: <span className="num">{company.bankIban}</span></div>
            {company.bankName && <div>{L("bank")}: {company.bankName}</div>}
            {company.bankBic && <div>BIC: {company.bankBic}</div>}
            <div>{L("paymentReason")}{data.number}</div>
          </div>
        )}
      </div>

      {/* Съставил / Получил — с имената на МОЛ-овете */}
      <div style={{ marginTop: 26, display: "flex", gap: 24, justifyContent: "space-between", fontSize: 12.5, color: "var(--ink-soft)" }}>
        <div style={{ flex: 1 }}>
          <div style={{ color: "var(--muted)", marginBottom: 24 }}>{L("preparedBy")}:</div>
          <div style={{ borderTop: "1px solid var(--border)", paddingTop: 4 }}>{company.mol || company.name}</div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ color: "var(--muted)", marginBottom: 24 }}>{L("signedRecipient")}:</div>
          <div style={{ borderTop: "1px solid var(--border)", paddingTop: 4 }}>{data.client?.mol || data.client?.name || ""}</div>
        </div>
      </div>

      {data.notes && (
        <div style={{ marginTop: 16, fontSize: 12.5, color: "var(--ink-soft)", borderTop: "1px solid var(--border)", paddingTop: 12 }}>
          <strong>{L("notes")}:</strong> {data.notes}
        </div>
      )}

      <div style={{ marginTop: 22, paddingTop: 12, borderTop: "1px solid var(--border)", fontSize: 10.5, color: "var(--muted)", textAlign: "center" }}>
        {L("platformCredit", { name: PLATFORM_NAME })} ·{" "}
        <a href="https://www.creativedigitalaccounting.com" style={{ color: "inherit", textDecoration: "none" }}>{PLATFORM_URL_DISPLAY}</a>
      </div>
    </>
  );

  if (layout === "leftrail") {
    return (
      <div className="glass printable" style={{ borderRadius: 14, maxWidth: 800, overflow: "hidden", display: "flex" }}>
        <div style={{ width: 64, background: accent, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ writingMode: "vertical-rl", transform: "rotate(180deg)", color: "#fff", fontFamily: serif, fontWeight: 700, fontSize: 20, letterSpacing: 3 }}>{title}</div>
        </div>
        <div style={{ padding: "40px 44px", flex: 1 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 30, gap: 16, flexWrap: "wrap" }}>
            <div>{logoOrName}{senderLines}</div>
            <div style={{ textAlign: "right", fontSize: 12.5, color: "var(--ink-soft)", lineHeight: 1.8 }}>
              <div className="num" style={{ fontSize: 16, fontWeight: 700, color: accent }}>№ {data.number}</div>
              <div>{L("issuedShort")}: {fmtDate(data.issueDate)}</div>
              {data.dueDate && <div>{L("dueDate")}: {fmtDate(data.dueDate)}</div>}
            </div>
          </div>
          {body}
        </div>
      </div>
    );
  }

  if (layout === "sidebar") {
    return (
      <div className="glass printable" style={{ borderRadius: 14, maxWidth: 800, overflow: "hidden", display: "flex", alignItems: "stretch" }}>
        <div style={{ width: "34%", flexShrink: 0, background: `${accent}10`, borderRight: `3px solid ${accent}`, padding: "36px 26px" }}>
          <div style={{ marginBottom: 18 }}>{logoOrName}</div>
          <div style={{ fontFamily: serif, fontSize: 22, fontWeight: 700, color: accent, letterSpacing: 1, marginBottom: 4 }}>{title}</div>
          <div className="num" style={{ fontSize: 14, color: "var(--ink-soft)", marginBottom: 6 }}>№ {data.number}</div>
          {data.type === "invoice" && <div style={{ display: "inline-block", border: `1.5px solid ${accent}`, color: accent, fontSize: 10, fontWeight: 700, letterSpacing: 1.5, padding: "2px 9px", borderRadius: 4, marginBottom: 16 }}>{L("original")}</div>}
          <div style={{ fontSize: 12, color: "var(--ink-soft)", lineHeight: 1.9, marginBottom: 18 }}>
            <div>{L("issuedShort")}: {fmtDate(data.issueDate)}</div>
            {data.taxEventDate && <div>{L("taxEventShort")}: {fmtDate(data.taxEventDate)}</div>}
            {data.dueDate && <div>{L("dueDate")}: {fmtDate(data.dueDate)}</div>}
          </div>
          <div style={{ borderTop: `1px solid ${accent}40`, paddingTop: 14 }}>
            <div style={{ fontSize: 10.5, color: accent, fontWeight: 700, letterSpacing: 1, marginBottom: 6 }}>{L("supplier")}</div>
            {senderLines}
          </div>
        </div>
        <div style={{ padding: "36px 32px", flex: 1, minWidth: 0 }}>
          {body}
        </div>
      </div>
    );
  }

  return (
    <div className="glass printable" style={{ borderRadius: 14, maxWidth: 800, overflow: "hidden" }}>
      {layout === "band" && <div style={{ height: 10, background: accent }} />}
      <div style={{ padding: "40px 48px" }}>
        {header}
        {body}
      </div>
    </div>
  );
}
