/**
 * Конфигурационна основа за модул „Търговия, доставки и логистика".
 *
 * ВАЖНО (корекции 2, 12, 13): нищо тук не е hardcode в бизнес изчисленията.
 * Стойностите са конфигурируеми defaults, а конкретните операции пазят snapshot
 * на реално използваната ставка/курс/валута. ЕИК се ползва САМО за първоначалния
 * lookup при активиране — никога в runtime проверки за достъп.
 */

// Ключ на модула в CompanyModuleAccess.moduleKey.
export const LOGISTICS_MODULE_KEY = "logistics";

// ЕИК на клиента — използва се ЕДИНСТВЕНО от setup/активиращата стъпка за намиране
// на Company record-а. Runtime достъпът се решава от CompanyModuleAccess, не оттук.
export const LOGISTICS_SETUP_EIK = "109581515";

// Defaults по фирма (корекции 12, 13). Configurable — конкретните документи пазят
// собствен snapshot, така че бъдеща законова промяна не пренаписва стари документи.
export const LOGISTICS_DEFAULTS = {
  bgCurrency: "EUR",
  mkCurrency: "MKD",
  mkVatRate: 18, // стандартна ставка за MK workflow (snapshot се пази към документа)
} as const;

// Scope-ове за атомарната номерация (NumberSequence.scope).
export const SEQ_SCOPE = {
  shipment: "shipment",
  supplierInvoice: "supplier_invoice",
  bgMkInvoice: "bg_mk_invoice",
  mkInvoice: "mk_invoice",
} as const;
export type SeqScope = (typeof SEQ_SCOPE)[keyof typeof SEQ_SCOPE];

/** Форматира вътрешния ID на курс: TR-2026-000001. */
export function formatShipmentId(year: number, value: number): string {
  return `TR-${year}-${String(value).padStart(6, "0")}`;
}

/** Форматира номер на BG→MK фактура: BM-2026-000001. */
export function formatBgMkNumber(year: number, value: number): string {
  return `BM-${year}-${String(value).padStart(6, "0")}`;
}

/** Форматира номер на MK фактура: MK-2026-000001. */
export function formatMkNumber(year: number, value: number): string {
  return `MK-${year}-${String(value).padStart(6, "0")}`;
}

// Статуси на курса (workflow, раздел 21). Подредени; разширяеми чрез добавяне тук
// + преводен ключ logistics.shipmentStatus.<id>. „loaded" = натоварен / очаква
// фактура от Holcim (статус по подразбиране след създаване от експедиционна бележка).
export const SHIPMENT_STATUSES = [
  "planned", "at_factory", "loading", "loaded", "left_factory", "in_transit",
  "at_border", "customs", "released", "in_mk", "arrived", "unloaded", "completed",
] as const;
export type ShipmentStatus = (typeof SHIPMENT_STATUSES)[number];
export const DEFAULT_SHIPMENT_STATUS: ShipmentStatus = "loaded";

export function isValidShipmentStatus(s: string): s is ShipmentStatus {
  return (SHIPMENT_STATUSES as readonly string[]).includes(s);
}

// Видове документи към курса (типизирани). Ключовете имат преводи logistics.docTypes.*
export const SHIPMENT_DOC_TYPES = [
  "dispatch_note", "holcim_invoice", "proforma", "cmr", "waybill", "customs_declaration",
  "export_doc", "import_doc", "transport_invoice", "border_doc", "forwarder_doc",
  "bg_mk_invoice", "mk_invoice", "payment_doc", "other",
] as const;
export type ShipmentDocType = (typeof SHIPMENT_DOC_TYPES)[number];
export function isValidShipmentDocType(s: string): s is ShipmentDocType {
  return (SHIPMENT_DOC_TYPES as readonly string[]).includes(s);
}

// Документи, необходими за досието на вноса (✓ наличен / ! липсва). Configurable.
export const REQUIRED_IMPORT_DOCS: ShipmentDocType[] = [
  "cmr", "customs_declaration", "export_doc", "import_doc",
];

// Транспортни етапи с очаквани времеви диапазони (workflow на движението).
export const TRANSPORT_MILESTONES = [
  "loading", "departure", "border_arrival", "border_crossing", "arrival",
] as const;
export type TransportMilestone = (typeof TRANSPORT_MILESTONES)[number];
export function isValidMilestone(s: string): s is TransportMilestone {
  return (TRANSPORT_MILESTONES as readonly string[]).includes(s);
}

// Толеранс (минути) след горната граница на очаквания диапазон, преди „Закъснение".
export const DELAY_GRACE_MINUTES = 90;

// Видове разходи при внос (Македония). Преводи: logistics.costTypes.*
export const IMPORT_COST_TYPES = [
  "transport", "border_fee", "customs_service", "forwarding", "tax", "mk_vat", "other",
] as const;
export type ImportCostType = (typeof IMPORT_COST_TYPES)[number];
export function isValidCostType(s: string): s is ImportCostType {
  return (IMPORT_COST_TYPES as readonly string[]).includes(s);
}
// По подразбиране ДДВ НЕ влиза в икономическата себестойност (възстановим данък).
export function costIncludedByDefault(costType: string): boolean {
  return costType !== "mk_vat";
}
