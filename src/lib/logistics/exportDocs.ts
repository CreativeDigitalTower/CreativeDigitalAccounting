/**
 * Изграждане на документните snapshot-и от централния export set (еквивалент на
 * Excel формулите ALL!C* → документи). Чисто и тествано. Всичко тук е AUTO-FILL —
 * резултатът се пази като snapshot и после е напълно editable (не се презаписва тихо).
 */
import { netAmount } from "@/lib/logistics/money";
import { Prisma } from "@prisma/client";
import type { ExportDocType } from "@/lib/logistics/config";

export type Party = {
  name: string | null; address?: string | null; city?: string | null; country?: string | null;
  eik?: string | null; registrationNumber?: string | null; vatNumber?: string | null;
};
export type ExportSetSource = {
  invoiceNumber: string | null; invoiceDate: string | null;
  destination: string | null; truckRegSnapshot: string | null; trailerReg: string | null;
  productSnapshot: string | null; customsCode?: string | null;
  quantity: number | null; unit: string; declarationCmrDate: string | null; dispatchNumber: string | null;
  holcimProforma?: { number: string | null; date: string | null } | null;
};
export type Parties = { seller: Party; buyer: Party; client: Party | null };

/** Комбиниран етикет „TRUCK / TRAILER" (визуализация; backend пази структурирано). */
export function truckTrailerLabel(truck: string | null, trailer: string | null): string {
  return [truck, trailer].filter(Boolean).join(" / ");
}

/** kg от тонове за CMR: quantity × 1000 (decimal). */
export function kgFromTonnes(quantity: number | null | undefined): number | null {
  if (quantity == null || !(quantity >= 0)) return null;
  return new Prisma.Decimal(quantity).times(1000).toDecimalPlaces(3).toNumber();
}

/** Стойност на invoice ред: количество × единична цена (decimal, 2 знака). */
export function invoiceLineValue(quantity: number | null | undefined, unitPrice: number | null | undefined): number | null {
  if (quantity == null || unitPrice == null) return null;
  return netAmount(quantity, unitPrice);
}

/** Ред стока за сумиране (label→value е editable snapshot). */
type GoodsLike = { quantity?: number | null; unitPrice?: number | null; value?: number | null };
/** Стойност на ред: явно зададена стойност, иначе количество × цена. */
export function goodsRowValue(g: GoodsLike): number | null {
  if (g.value != null) return g.value;
  return invoiceLineValue(g.quantity, g.unitPrice);
}
/** Обобщения за invoice таблица: общо количество (3 знака) и обща стойност (2 знака). */
export function invoiceTotals(goods: GoodsLike[]): { quantity: number; value: number } {
  const quantity = goods.reduce<Prisma.Decimal>((s, g) => s.plus(g.quantity ?? 0), new Prisma.Decimal(0));
  const value = goods.reduce<Prisma.Decimal>((s, g) => s.plus(goodsRowValue(g) ?? 0), new Prisma.Decimal(0));
  return { quantity: quantity.toDecimalPlaces(3).toNumber(), value: value.toDecimalPlaces(2).toNumber() };
}
/**
 * Печатен отстъп на CMR мрежата спрямо предпечатаната бланка. Epson и HP са
 * калибрирани различно → държим ги разделно (спец. изискване). Стойности в px.
 */
export function cmrPrintOffset(layout: string | null | undefined): { top: number; left: number } {
  return layout === "hp" ? { top: 6, left: 4 } : { top: 0, left: 0 };
}

/** Общо количество за испратница/празна (3 знака). */
export function dispatchTotalQuantity(rows: { quantity?: number | null }[]): number {
  return rows.reduce<Prisma.Decimal>((s, r) => s.plus(r.quantity ?? 0), new Prisma.Decimal(0)).toDecimalPlaces(3).toNumber();
}

/**
 * Изгражда данните за конкретен документ от source-а (auto-fill). Връща plain обект,
 * който се пази в ExportDocument.data и после е editable.
 */
export function buildDocumentData(src: ExportSetSource, parties: Parties, docType: ExportDocType): Record<string, unknown> {
  const truck = truckTrailerLabel(src.truckRegSnapshot, src.trailerReg);
  switch (docType) {
    case "invoice":
      return {
        invoiceNumber: src.invoiceNumber, invoiceDate: src.invoiceDate,
        seller: parties.seller, buyer: parties.buyer,
        contract: null, annex: null, order: null,
        termsOfDelivery: src.destination ? `FCA ${(parties.seller.city ?? "").toUpperCase()}` : "FCA",
        truck, placeOfShipment: parties.seller.city ?? null, dateOfShipment: src.invoiceDate,
        destination: src.destination, destinationCountry: parties.buyer.country ?? null,
        goods: [{ description: src.productSnapshot ? `CEMENT ${src.productSnapshot} - IN BULK` : null, quantity: src.quantity, unit: src.unit || "TNE", unitPrice: null, value: null, currency: "EUR", certificate: null }],
        vatText: "Export, Art.28 Bulgarian VAT Legislation", vatRate: 0, vatAmount: 0,
        originText: "ИЗНОСИТЕЛЯТ НА ПРОДУКТИТЕ, ОБХВАНАТИ ОТ ТОЗИ ДОКУМЕНТ, ДЕКЛАРИРА, ЧЕ ОСВЕН КЪДЕТО ЯСНО Е ОТБЕЛЯЗАНО ДРУГО, ТЕЗИ ПРОДУКТИ СА С EU ПРЕФЕРЕНЦИАЛЕН ПРОИЗХОД",
        originPlace: (parties.seller.city ?? "").toUpperCase() || null, originSigner: parties.seller.name ? null : null,
        paymentConditions: "Bank transfer", totalQuantity: src.quantity, totalValue: null, notes: null,
      };
    case "dispatch":
    case "blank": {
      const recipient = docType === "blank" ? null : (parties.client ?? null);
      return {
        dispatchNumber: src.dispatchNumber, date: src.invoiceDate,
        issuer: parties.buyer, // MK фирмата издава испратницата
        recipient, destination: src.destination,
        rows: [{ lineNo: 1, truck, material: src.productSnapshot, unit: src.unit || "t", quantity: src.quantity, valueMkd: "по фактура" }],
        totalQuantity: src.quantity,
      };
    }
    case "declaration":
      return {
        regulation: "Регламент – EC №2447/2015, Приложение 22-10", title: "ДЕКЛАРАЦИЯ",
        declarantName: parties.seller.name, bgCompany: parties.seller,
        proformaNumber: src.holcimProforma?.number ?? null, proformaDate: src.holcimProforma?.date ?? null, holcim: "ХОЛСИМ (БЪЛГАРИЯ) АД",
        invoiceNumber: src.invoiceNumber, invoiceDate: src.invoiceDate, product: src.productSnapshot,
        origin: "BG и EU", place: parties.seller.city ?? null, date: src.declarationCmrDate,
        declarant: null,
        bodyText: `Долуподписаният, представител на „${parties.seller.name ?? ""}", декларирам, че изнасяните стоки (цимент), описани във ф-ра № ${src.invoiceNumber ?? ""}, са с произход BG и EU и отговарят на правилата за произход в преференциалната търговия.`,
      };
    case "cmr_epson":
    case "cmr_hp":
      return {
        layout: docType === "cmr_epson" ? "epson" : "hp",
        sender: parties.seller, consignee: parties.buyer,
        destination: src.destination, placeOfShipment: `${(parties.seller.city ?? "").toUpperCase()}, ${(parties.seller.country ?? "").toUpperCase()}`,
        date: src.declarationCmrDate, truck, invoiceNumber: src.invoiceNumber,
        goods: { description: src.productSnapshot ? `CEMENT ${src.productSnapshot}` : "CEMENT", customsCode: src.customsCode ?? null },
        weightKg: kgFromTonnes(src.quantity), speditor: null,
      };
  }
}
