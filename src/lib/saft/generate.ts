import { prisma } from "@/lib/prisma";
import { COMPANY_NAME, COMPANY_EIK, PLATFORM_NAME } from "@/lib/constants";

/**
 * SAF-T (Standard Audit File for Tax) генератор за България.
 *
 * Структурата следва OECD SAF-T 2.0 / НАП: Header, MasterFiles
 * (GeneralLedgerAccounts, Customers, Suppliers, TaxTable, Products, Assets),
 * GeneralLedgerEntries и SourceDocuments (SalesInvoices, PurchaseInvoices).
 *
 * Типове файлове (по изисквания на НАП):
 *  - monthly    → счетоводни данни за месец (главна книга + документи)
 *  - annual     → годишни данни (вкл. дълготрайни активи)
 *  - on_demand  → при поискване (складови наличности / активи — снимка към дата)
 *
 * Забележка: при публикуване на официалната XSD от НАП, namespace/URI и някои
 * имена на елементи може да се нуждаят от финална настройка към точната схема.
 */

export type SaftType = "monthly" | "annual" | "on_demand";

const SAFT_VERSION = "1.0";
const NAMESPACE = "urn:StandardAuditFile-Taxation-Financial:BG";

// Минимален стандартен сметкоплан (национален) за връзка към записите.
const GL_ACCOUNTS: { id: string; desc: string }[] = [
  { id: "411", desc: "Клиенти" },
  { id: "401", desc: "Доставчици" },
  { id: "4532", desc: "Начислен данък за продажбите (ДДС)" },
  { id: "4531", desc: "Данъчен кредит (ДДС)" },
  { id: "702", desc: "Приходи от продажби на продукция/стоки" },
  { id: "703", desc: "Приходи от услуги" },
  { id: "601", desc: "Разходи за материали" },
  { id: "602", desc: "Разходи за външни услуги" },
  { id: "503", desc: "Разплащателна сметка" },
  { id: "501", desc: "Каса" },
];

function esc(v: unknown): string {
  const s = v == null ? "" : String(v);
  return s.replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" }[c] as string));
}
function n2(v: number): string { return (Math.round((v + Number.EPSILON) * 100) / 100).toFixed(2); }
function ymd(d: Date | null | undefined): string {
  if (!d) return "";
  const dt = new Date(d);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
}

type LineCalc = { net: number; vat: number; gross: number; rate: number };
function calcLine(quantity: number, unitPrice: number, vatRate: number): LineCalc {
  const net = quantity * unitPrice;
  const vat = net * (vatRate / 100);
  return { net, vat, gross: net + vat, rate: vatRate };
}

export async function buildSaftXml(companyId: string, opts: { year: number; month: number | null; type: SaftType }): Promise<{ xml: string; filename: string }> {
  const { year, month, type } = opts;

  const periodStart = month ? new Date(year, month - 1, 1) : new Date(year, 0, 1);
  const periodEnd = month ? new Date(year, month, 0) : new Date(year, 11, 31);
  const endExclusive = new Date(periodEnd.getFullYear(), periodEnd.getMonth(), periodEnd.getDate() + 1);

  const [company, clients, suppliers, docs, expenses, products, assets] = await Promise.all([
    prisma.company.findUnique({ where: { id: companyId } }),
    prisma.client.findMany({ where: { companyId } }),
    prisma.supplier.findMany({ where: { companyId } }),
    prisma.document.findMany({
      where: { companyId, type: { in: ["invoice", "credit_note", "debit_note"] }, issueDate: { gte: periodStart, lt: endExclusive } },
      include: { client: true, lines: true },
      orderBy: { issueDate: "asc" },
    }),
    prisma.expense.findMany({
      where: { companyId, date: { gte: periodStart, lt: endExclusive } },
      include: { supplier: true, category: true },
      orderBy: { date: "asc" },
    }),
    prisma.stockItem.findMany({ where: { companyId } }),
    prisma.asset.findMany({ where: { companyId } }),
  ]);
  if (!company) throw new Error("Company not found");

  const currency = company.defaultCurrency || "EUR";
  const now = new Date();

  const parts: string[] = [];
  parts.push(`<?xml version="1.0" encoding="UTF-8"?>`);
  parts.push(`<AuditFile xmlns="${NAMESPACE}">`);

  // ─── Header ───
  parts.push(`<Header>`);
  parts.push(`<AuditFileVersion>${SAFT_VERSION}</AuditFileVersion>`);
  parts.push(`<AuditFileCountry>BG</AuditFileCountry>`);
  parts.push(`<AuditFileDateCreated>${ymd(now)}</AuditFileDateCreated>`);
  parts.push(`<SoftwareCompanyName>${esc(COMPANY_NAME)}</SoftwareCompanyName>`);
  parts.push(`<SoftwareID>${esc(PLATFORM_NAME)}</SoftwareID>`);
  parts.push(`<SoftwareVersion>${SAFT_VERSION}</SoftwareVersion>`);
  parts.push(`<Company>`);
  parts.push(`<RegistrationNumber>${esc(company.eik ?? "")}</RegistrationNumber>`);
  parts.push(`<Name>${esc(company.name)}</Name>`);
  parts.push(`<Address>`);
  parts.push(`<StreetName>${esc(company.address ?? "")}</StreetName>`);
  parts.push(`<City>${esc(company.city ?? "")}</City>`);
  parts.push(`<Country>BG</Country>`);
  parts.push(`</Address>`);
  parts.push(`<Contact><ContactPerson><FirstName>${esc(company.mol ?? "")}</FirstName></ContactPerson>${company.email ? `<Email>${esc(company.email)}</Email>` : ""}${company.phone ? `<Telephone>${esc(company.phone)}</Telephone>` : ""}</Contact>`);
  parts.push(`<TaxRegistration><TaxRegistrationNumber>${esc(company.vatRegistered ? (company.vatNumber ?? "") : (company.eik ?? ""))}</TaxRegistrationNumber><TaxType>VAT</TaxType></TaxRegistration>`);
  if (company.bankIban) parts.push(`<BankAccount><IBANNumber>${esc(company.bankIban)}</IBANNumber>${company.bankName ? `<BankAccountName>${esc(company.bankName)}</BankAccountName>` : ""}</BankAccount>`);
  parts.push(`</Company>`);
  parts.push(`<DefaultCurrencyCode>${esc(currency)}</DefaultCurrencyCode>`);
  parts.push(`<SelectionCriteria><SelectionStartDate>${ymd(periodStart)}</SelectionStartDate><SelectionEndDate>${ymd(periodEnd)}</SelectionEndDate><PeriodStart>${month ?? 1}</PeriodStart><PeriodStartYear>${year}</PeriodStartYear></SelectionCriteria>`);
  parts.push(`<TaxAccountingBasis>${type === "monthly" ? "M" : type === "annual" ? "A" : "O"}</TaxAccountingBasis>`);
  parts.push(`<HeaderComment>SAF-T BG · ${type} · ${esc(company.name)}</HeaderComment>`);
  parts.push(`</Header>`);

  // ─── MasterFiles ───
  parts.push(`<MasterFiles>`);

  // GeneralLedgerAccounts
  parts.push(`<GeneralLedgerAccounts>`);
  for (const a of GL_ACCOUNTS) {
    parts.push(`<Account><AccountID>${a.id}</AccountID><AccountDescription>${esc(a.desc)}</AccountDescription><StandardAccountID>${a.id}</StandardAccountID><AccountType>GL</AccountType></Account>`);
  }
  parts.push(`</GeneralLedgerAccounts>`);

  // Customers
  parts.push(`<Customers>`);
  for (const c of clients) {
    parts.push(`<Customer>`);
    parts.push(`<CustomerID>${esc(c.id)}</CustomerID>`);
    parts.push(`<AccountID>411</AccountID>`);
    parts.push(`<CustomerTaxID>${esc(c.vatNumber ?? c.eik ?? "")}</CustomerTaxID>`);
    parts.push(`<CompanyName>${esc(c.name)}</CompanyName>`);
    parts.push(`<BillingAddress><StreetName>${esc(c.address ?? "")}</StreetName><City>${esc(c.city ?? "")}</City><Country>BG</Country></BillingAddress>`);
    parts.push(`<Contact><ContactPerson><FirstName>${esc(c.contactPerson ?? c.mol ?? "")}</FirstName></ContactPerson>${c.contactEmail ? `<Email>${esc(c.contactEmail)}</Email>` : ""}</Contact>`);
    parts.push(`</Customer>`);
  }
  parts.push(`</Customers>`);

  // Suppliers
  parts.push(`<Suppliers>`);
  for (const s of suppliers) {
    parts.push(`<Supplier>`);
    parts.push(`<SupplierID>${esc(s.id)}</SupplierID>`);
    parts.push(`<AccountID>401</AccountID>`);
    parts.push(`<SupplierTaxID>${esc(s.vatNumber ?? s.eik ?? "")}</SupplierTaxID>`);
    parts.push(`<CompanyName>${esc(s.name)}</CompanyName>`);
    parts.push(`<BillingAddress><StreetName>${esc(s.address ?? "")}</StreetName><City>${esc(s.city ?? "")}</City><Country>BG</Country></BillingAddress>`);
    parts.push(`</Supplier>`);
  }
  parts.push(`</Suppliers>`);

  // TaxTable
  parts.push(`<TaxTable>`);
  parts.push(`<TaxTableEntry><TaxType>VAT</TaxType><Description>Данък върху добавената стойност</Description>`);
  for (const rate of [20, 9, 0]) {
    parts.push(`<TaxCodeDetails><TaxCode>VAT${rate}</TaxCode><Description>ДДС ${rate}%</Description><TaxPercentage>${n2(rate)}</TaxPercentage><Country>BG</Country></TaxCodeDetails>`);
  }
  parts.push(`</TaxTableEntry>`);
  parts.push(`</TaxTable>`);

  // Products (складови артикули) — включваме за on_demand/annual/monthly
  if (products.length) {
    parts.push(`<Products>`);
    for (const p of products) {
      parts.push(`<Product><ProductCode>${esc(p.sku ?? p.id)}</ProductCode><Description>${esc(p.name)}</Description><UOMBase>${esc(p.unit)}</UOMBase></Product>`);
    }
    parts.push(`</Products>`);
  }

  // Assets — за годишен/при поискване
  if ((type === "annual" || type === "on_demand") && assets.length) {
    parts.push(`<Assets>`);
    for (const a of assets) {
      parts.push(`<Asset><AssetID>${esc(a.id)}</AssetID><Description>${esc(a.name)}</Description><AssetType>${esc(a.category)}</AssetType><AcquisitionDate>${ymd(a.acquiredDate)}</AcquisitionDate><AcquisitionCost>${n2(a.value)}</AcquisitionCost><BookValue>${n2(a.bookValue)}</BookValue><DepreciationAmount>${n2(a.annualDepreciation)}</DepreciationAmount></Asset>`);
    }
    parts.push(`</Assets>`);
  }
  parts.push(`</MasterFiles>`);

  // ─── GeneralLedgerEntries (само за monthly/annual) ───
  if (type === "monthly" || type === "annual") {
    let txCount = 0;
    let totalDebit = 0;
    let totalCredit = 0;
    const journalLines: string[] = [];

    for (const d of docs) {
      const sign = d.type === "credit_note" ? -1 : 1;
      let net = 0, vat = 0;
      for (const l of d.lines) { const c = calcLine(l.quantity, l.unitPrice, l.vatRate); net += c.net; vat += c.vat; }
      net *= sign; vat *= sign; const gross = net + vat;
      txCount++;
      totalDebit += gross; totalCredit += net + vat;
      journalLines.push(
        `<Transaction><TransactionID>${esc(d.number)}</TransactionID><TransactionDate>${ymd(d.issueDate)}</TransactionDate><Description>Продажба ${esc(d.number)}</Description>` +
        `<Lines>` +
        `<DebitLine><AccountID>411</AccountID><CustomerID>${esc(d.clientId ?? "")}</CustomerID><DebitAmount>${n2(gross)}</DebitAmount></DebitLine>` +
        `<CreditLine><AccountID>702</AccountID><CreditAmount>${n2(net)}</CreditAmount></CreditLine>` +
        (vat ? `<CreditLine><AccountID>4532</AccountID><CreditAmount>${n2(vat)}</CreditAmount></CreditLine>` : "") +
        `</Lines></Transaction>`
      );
    }
    for (const e of expenses) {
      const net = e.amount; const vat = e.vatAmount ?? 0; const gross = net + vat;
      txCount++;
      totalDebit += net + vat; totalCredit += gross;
      journalLines.push(
        `<Transaction><TransactionID>${esc(e.invoiceNumber ?? e.id)}</TransactionID><TransactionDate>${ymd(e.date)}</TransactionDate><Description>Разход ${esc(e.description)}</Description>` +
        `<Lines>` +
        `<DebitLine><AccountID>602</AccountID><DebitAmount>${n2(net)}</DebitAmount></DebitLine>` +
        (vat ? `<DebitLine><AccountID>4531</AccountID><DebitAmount>${n2(vat)}</DebitAmount></DebitLine>` : "") +
        `<CreditLine><AccountID>401</AccountID><SupplierID>${esc(e.supplierId ?? "")}</SupplierID><CreditAmount>${n2(gross)}</CreditAmount></CreditLine>` +
        `</Lines></Transaction>`
      );
    }

    parts.push(`<GeneralLedgerEntries>`);
    parts.push(`<NumberOfEntries>${txCount}</NumberOfEntries>`);
    parts.push(`<TotalDebit>${n2(totalDebit)}</TotalDebit>`);
    parts.push(`<TotalCredit>${n2(totalCredit)}</TotalCredit>`);
    parts.push(`<Journal><JournalID>GL-${year}${month ? String(month).padStart(2, "0") : ""}</JournalID><Description>Главна книга ${year}${month ? "/" + month : ""}</Description>`);
    parts.push(journalLines.join(""));
    parts.push(`</Journal>`);
    parts.push(`</GeneralLedgerEntries>`);
  }

  // ─── SourceDocuments ───
  parts.push(`<SourceDocuments>`);

  // SalesInvoices
  {
    let totalNet = 0, totalVat = 0, totalGross = 0;
    const invLines: string[] = [];
    for (const d of docs) {
      let net = 0, vat = 0;
      const lineXml: string[] = [];
      d.lines.forEach((l, i) => {
        const c = calcLine(l.quantity, l.unitPrice, l.vatRate);
        net += c.net; vat += c.vat;
        lineXml.push(
          `<Line><LineNumber>${i + 1}</LineNumber>` +
          `<ProductCode>${esc(l.nomenclatureCode ?? l.id)}</ProductCode>` +
          `<ProductDescription>${esc(l.description)}</ProductDescription>` +
          `<Quantity>${n2(l.quantity)}</Quantity>` +
          `<UnitPrice>${n2(l.unitPrice)}</UnitPrice>` +
          `<TaxPointDate>${ymd(d.taxEventDate ?? d.issueDate)}</TaxPointDate>` +
          `<CreditAmount>${n2(c.net)}</CreditAmount>` +
          `<Tax><TaxType>VAT</TaxType><TaxCode>VAT${l.vatRate}</TaxCode><TaxPercentage>${n2(l.vatRate)}</TaxPercentage><TaxAmount>${n2(c.vat)}</TaxAmount></Tax>` +
          `</Line>`
        );
      });
      const gross = net + vat;
      totalNet += net; totalVat += vat; totalGross += gross;
      invLines.push(
        `<Invoice>` +
        `<InvoiceNo>${esc(d.number)}</InvoiceNo>` +
        `<InvoiceType>${d.type === "credit_note" ? "KI" : d.type === "debit_note" ? "DI" : "FT"}</InvoiceType>` +
        `<InvoiceDate>${ymd(d.issueDate)}</InvoiceDate>` +
        `<TaxPointDate>${ymd(d.taxEventDate ?? d.issueDate)}</TaxPointDate>` +
        `<CustomerInfo><CustomerID>${esc(d.clientId ?? "")}</CustomerID><CompanyName>${esc(d.client?.name ?? "Физическо лице")}</CompanyName><CustomerTaxID>${esc(d.clientIsIndividual ? "" : (d.client?.vatNumber ?? d.client?.eik ?? ""))}</CustomerTaxID></CustomerInfo>` +
        lineXml.join("") +
        `<DocumentTotals><NetTotal>${n2(net)}</NetTotal><TaxPayable>${n2(vat)}</TaxPayable><GrossTotal>${n2(gross)}</GrossTotal></DocumentTotals>` +
        `</Invoice>`
      );
    }
    parts.push(`<SalesInvoices>`);
    parts.push(`<NumberOfEntries>${docs.length}</NumberOfEntries>`);
    parts.push(`<TotalDebit>${n2(0)}</TotalDebit>`);
    parts.push(`<TotalCredit>${n2(totalNet)}</TotalCredit>`);
    parts.push(invLines.join(""));
    parts.push(`</SalesInvoices>`);
  }

  // PurchaseInvoices (от разходи)
  {
    let totalNet = 0;
    const purLines: string[] = [];
    for (const e of expenses) {
      const net = e.amount; const vat = e.vatAmount ?? 0; const gross = net + vat;
      totalNet += net;
      purLines.push(
        `<Invoice>` +
        `<InvoiceNo>${esc(e.invoiceNumber ?? e.id)}</InvoiceNo>` +
        `<InvoiceDate>${ymd(e.date)}</InvoiceDate>` +
        `<SupplierInfo><SupplierID>${esc(e.supplierId ?? "")}</SupplierID><CompanyName>${esc(e.supplier?.name ?? "—")}</CompanyName><SupplierTaxID>${esc(e.supplier?.vatNumber ?? e.supplier?.eik ?? "")}</SupplierTaxID></SupplierInfo>` +
        `<Line><LineNumber>1</LineNumber><ProductDescription>${esc(e.description)}</ProductDescription><DebitAmount>${n2(net)}</DebitAmount>` +
        `<Tax><TaxType>VAT</TaxType><TaxAmount>${n2(vat)}</TaxAmount></Tax></Line>` +
        `<DocumentTotals><NetTotal>${n2(net)}</NetTotal><TaxPayable>${n2(vat)}</TaxPayable><GrossTotal>${n2(gross)}</GrossTotal></DocumentTotals>` +
        `</Invoice>`
      );
    }
    parts.push(`<PurchaseInvoices>`);
    parts.push(`<NumberOfEntries>${expenses.length}</NumberOfEntries>`);
    parts.push(`<TotalDebit>${n2(totalNet)}</TotalDebit>`);
    parts.push(`<TotalCredit>${n2(0)}</TotalCredit>`);
    parts.push(purLines.join(""));
    parts.push(`</PurchaseInvoices>`);
  }

  parts.push(`</SourceDocuments>`);
  parts.push(`</AuditFile>`);

  const periodTag = month ? `${year}-${String(month).padStart(2, "0")}` : `${year}`;
  const filename = `SAF-T_${(company.eik ?? "firma")}_${type}_${periodTag}.xml`;
  return { xml: parts.join("\n"), filename };
}

/** Проверява дали фирмата има нужните за SAF-T данни. Връща липсващите полета. */
export function saftMissingFields(company: { eik: string | null; name: string; address: string | null; city: string | null; mol: string | null }): string[] {
  const missing: string[] = [];
  if (!company.eik) missing.push("ЕИК / БУЛСТАТ");
  if (!company.name) missing.push("Наименование");
  if (!company.address) missing.push("Адрес на регистрация");
  if (!company.city) missing.push("Град");
  if (!company.mol) missing.push("МОЛ");
  return missing;
}
