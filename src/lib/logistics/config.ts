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
