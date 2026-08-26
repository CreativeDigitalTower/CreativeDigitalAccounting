/**
 * Чиста логика за „Получени доставки" (BG→MK) — без DB, тествана изолирано.
 *
 * Концепция (§3/§34): една source `ExportDocumentSet` (BG продавач → MK купувач) е
 * получената доставка. MK фирмата НЕ въвежда нищо повторно — вижда я през relation
 * (`buyerCompanyId` + обща CompanyGroup). Статусът за фактуриране се ИЗВЕЖДА от
 * съществуването на валидна `MkInvoice` с `sourceExportSetId = set.id` (§19/§20):
 * изтрита фактура → доставката автоматично се връща в „За фактуриране".
 */

export type ReceivedInvoiceStatus = "uninvoiced" | "invoiced";

export type ReceivedSetInput = {
  id: string;
  invoiceNumber: string;
  invoiceDate: Date | string | null;
  destination: string | null;
  deliveryTerm: string | null;
  truckRegSnapshot: string | null;
  trailerReg: string | null;
  productSnapshot: string | null;
  quantity: number | null;
  unit: string;
  status: string;
  sellerName: string | null;
  clientName: string | null;
};

export type ReceivedMkInvoice = { id: string; number: string } | null;

/** Статусът се определя ЕДИНСТВЕНО от наличието на валидна MK фактура (§19/§20). */
export function receivedInvoiceStatus(mkInvoice: ReceivedMkInvoice): ReceivedInvoiceStatus {
  return mkInvoice ? "invoiced" : "uninvoiced";
}

export type ReceivedRow = ReceivedSetInput & {
  mkInvoice: ReceivedMkInvoice;
  invoiceStatus: ReceivedInvoiceStatus;
  suggestedClientId: string | null;
};

export type ReceivedKpi = { received: number; uninvoiced: number; invoiced: number; totalQuantity: number };

/**
 * Обединява получените доставки с техните MK фактури (по sourceExportSetId) + предложен
 * краен клиент, и смята KPI (§9). Чисто — API-то подава вече заредените map-ове.
 */
export function buildReceivedView(
  sets: ReceivedSetInput[],
  invoiceBySetId: Map<string, { id: string; number: string }>,
  suggestClientId: (set: ReceivedSetInput) => string | null,
): { kpi: ReceivedKpi; rows: ReceivedRow[] } {
  const kpi: ReceivedKpi = { received: 0, uninvoiced: 0, invoiced: 0, totalQuantity: 0 };
  const rows = sets.map((s) => {
    const mkInvoice = invoiceBySetId.get(s.id) ?? null;
    const invoiceStatus = receivedInvoiceStatus(mkInvoice);
    kpi.received++;
    if (invoiceStatus === "invoiced") kpi.invoiced++; else kpi.uninvoiced++;
    kpi.totalQuantity += s.quantity ?? 0;
    return { ...s, mkInvoice, invoiceStatus, suggestedClientId: suggestClientId(s) };
  });
  // Закръгляне на общото количество на 3 знака (§6), без float drift.
  kpi.totalQuantity = Math.round(kpi.totalQuantity * 1000) / 1000;
  return { kpi, rows };
}

/** Полета, задължителни преди издаване на MK фактура от доставка (§27). */
export type MkInvoicePrereq = { clientId: string | null | undefined; quantity: number | null | undefined; product: string | null | undefined };

export function mkInvoiceMissingFields(p: MkInvoicePrereq): Array<"client" | "quantity" | "product"> {
  const missing: Array<"client" | "quantity" | "product"> = [];
  if (!p.clientId) missing.push("client");
  if (p.quantity == null || p.quantity <= 0) missing.push("quantity");
  if (!(p.product ?? "").trim()) missing.push("product");
  return missing;
}
