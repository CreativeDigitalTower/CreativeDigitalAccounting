/**
 * Изграждане на документните snapshot-и от централния export set (еквивалент на
 * Excel формулите ALL!C* → документи). Чисто и тествано. Всичко тук е AUTO-FILL —
 * резултатът се пази като snapshot и после е напълно editable (не се презаписва тихо).
 */
import { netAmount } from "@/lib/logistics/money";
import { resolveDispatchIssuer } from "@/lib/logistics/dispatchIssuer";
import { resolveInvoiceParty } from "@/lib/logistics/invoiceParties";
import { invoiceDeliveryTerms, destinationEn, PLACE_OF_SHIPMENT_DEFAULT } from "@/lib/logistics/deliveryTerms";
import { Prisma } from "@prisma/client";
import type { ExportDocType } from "@/lib/logistics/config";

export type Party = {
  name: string | null; address?: string | null; city?: string | null; country?: string | null;
  eik?: string | null; registrationNumber?: string | null; vatNumber?: string | null;
  // Английски legal snapshot (за invoice/CMR). Ако липсва → fallback към BG стойностите.
  nameEn?: string | null; addressEn?: string | null; cityEn?: string | null; countryEn?: string | null;
  manager?: string | null; // управител/МОЛ (за invoice manager блок, декларатор)
};

// Превод на често срещани държави BG→EN (за export документи). Passthrough при непознати.
const COUNTRY_EN: Record<string, string> = {
  "българия": "Bulgaria", "bulgaria": "Bulgaria",
  "северна македония": "North Macedonia", "македония": "North Macedonia",
  "north macedonia": "North Macedonia", "republic of north macedonia": "North Macedonia",
  "гърция": "Greece", "румъния": "Romania", "турция": "Türkiye", "сърбия": "Serbia",
};
/** Английско име на държава (за export документи); връща оригинала при непознати. */
export function translateCountry(country: string | null | undefined): string | null {
  if (!country) return country ?? null;
  return COUNTRY_EN[country.trim().toLowerCase()] ?? country;
}

/** Английски display на фирма за export документ: En полета с fallback към BG. */
export function partyEn(p: Party | null | undefined): Party {
  if (!p) return { name: null };
  return {
    ...p,
    name: p.nameEn || p.name,
    address: p.addressEn || p.address,
    city: p.cityEn || p.city,
    country: translateCountry(p.countryEn || p.country),
  };
}

/**
 * Чисто решение за роля при ЧЕТЕНЕ на export set: продавачът винаги; купувачът само
 * ако е в същата бизнес група (intercompany shared visibility). Инжектира се `sameGroup`,
 * за да е тестваемо без DB.
 */
export function resolveExportSetRole(
  activeCompanyId: string,
  set: { companyId: string; buyerCompanyId: string | null },
  sameGroup: boolean,
): "seller" | "buyer" | null {
  if (set.companyId === activeCompanyId) return "seller";
  if (set.buyerCompanyId && set.buyerCompanyId === activeCompanyId && sameGroup) return "buyer";
  return null;
}

/** Обратното на truckTrailerLabel: „SK501TO / SK5022AE" → { truck, trailer }. */
export function splitTruckTrailer(label: string | null | undefined): { truck: string | null; trailer: string | null } {
  const s = (label ?? "").trim();
  if (!s) return { truck: null, trailer: null };
  const parts = s.split("/").map((x) => x.trim()).filter(Boolean);
  return { truck: parts[0] ?? null, trailer: parts.length > 1 ? parts.slice(1).join(" / ") : null };
}
export type ExportSetSource = {
  invoiceNumber: string | null; invoiceDate: string | null; shipmentDate?: string | null;
  deliveryTerm?: string | null; placeOfShipment?: string | null;
  destination: string | null; truckRegSnapshot: string | null; trailerReg: string | null;
  productSnapshot: string | null; customsCode?: string | null; certificateNumberSnapshot?: string | null;
  quantity: number | null; unit: string; declarationCmrDate: string | null; dispatchNumber: string | null;
  holcimProforma?: { number: string | null; date: string | null } | null;
};
export type Parties = { seller: Party; buyer: Party; client: Party | null };

/**
 * Единен canonical formatter за сертификатния ред (§1/§8). Ползва се от Invoice, CMR EPSON
 * и CMR HP — един и същ текст „(Certificate No <номер>)". Липсва сертификат → null (§9):
 * редът не се рендерира (без „(Certificate No )" / null / undefined).
 */
export function formatCertificateLine(value: string | null | undefined): string | null {
  const v = (value ?? "").trim();
  return v ? `(Certificate No ${v})` : null;
}

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
 * Задължителен нормативен текст в декларацията (по реалния клиентски шаблон от
 * SK501.xlsx, sheet „Декларация"). Auto-fill, но остава editable.
 */
export const DECLARATION_STATEMENT =
  "Декларирам, че: Кумулация не е приложена. Задължавам се, при поискване от митническите власти, да предоставя всички допълнителни документи.";

// Default доставчик на проформата (Холсим) — по клиентския шаблон.
export const PROFORMA_SUPPLIER = "ХОЛСИМ (БЪЛГАРИЯ) АД";

/** Структурирани променливи за декларацията (всички editable snapshot). */
export type DeclarationVars = {
  declarantName?: string | null; representedCompany?: string | null;
  proformaNumber?: string | null; proformaDate?: string | null; proformaSupplier?: string | null;
  invoiceNumber?: string | null; invoiceDate?: string | null; origin?: string | null;
};
const dmy = (s?: string | null) => {
  if (!s) return "";
  const d = new Date(s); if (isNaN(d.getTime())) return String(s);
  return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()}`;
};
/**
 * Съставя точния текст на декларацията от структурираните променливи (по SK501.xlsx).
 * Промяна на proforma/invoice номер/дата веднага променя изхода.
 */
export function buildDeclarationText(v: DeclarationVars): string {
  const origin = v.origin || "BG и EU";
  const proformaLine = (v.proformaNumber || v.proformaDate)
    ? `Проформа Фактура ${v.proformaNumber ?? ""} /${dmy(v.proformaDate)}год. на фирма ${v.proformaSupplier || PROFORMA_SUPPLIER},`
    : `на фирма ${v.proformaSupplier || PROFORMA_SUPPLIER},`;
  return [
    `Долуподписаният ${v.declarantName ?? ""}, представител на „${v.representedCompany ?? ""}", на основание:`,
    proformaLine,
    `декларирам, че изнасяните стоки (цимент), описани във ф-ра № ${v.invoiceNumber ?? ""}/${dmy(v.invoiceDate)} са с произход ${origin} и отговарят на правилата за произход в преференциалната търговия.`,
  ].join("\n");
}

/**
 * Решава дали „Генерирай всички" да презапише вече съществуващ документ.
 * Финализиран документ НЕ се презаписва (изисква изрично отваряне за редакция);
 * документ с ръчни промени (overridden) се презаписва само при force.
 */
export function shouldRegenerate(doc: { status?: string | null; overridden?: boolean | null } | null | undefined, force: boolean): boolean {
  if (!doc) return true;                        // нов документ — създава се
  if (doc.status === "finalized") return false; // финализиран — никога тихо
  if (doc.overridden) return force;             // ръчна промяна — само при force
  return true;                                  // непроменен draft — обновява се
}

/**
 * Печатен отстъп на CMR мрежата спрямо предпечатаната бланка. Epson и HP са
 * калибрирани различно → държим ги разделно (спец. изискване). Стойности в px.
 */
export function cmrPrintOffset(layout: string | null | undefined): { top: number; left: number } {
  return layout === "hp" ? { top: 6, left: 4 } : { top: 0, left: 0 };
}

/** Общо количество за испратница/празна (3 знака). */
/**
 * Presentation mapping на мерната единица за Испратницата (§1): вътрешно
 * t/T/ton/tone/tne → визуално „ТОН". Не променя DB/бизнес логиката.
 */
export function displayUnit(u?: string | null): string {
  const k = (u ?? "").trim().toLowerCase();
  if (k === "") return "";
  if (["t", "т", "ton", "tone", "tonne", "tons", "tne", "тон", "тона"].includes(k)) return "ТОН";
  return (u ?? "").toUpperCase();
}

/** Мерна единица за export ФАКТУРАТА (§14): t/T/ton/tonne/тон → „TNE". Presentation only. */
export function displayUnitTNE(u?: string | null): string {
  const k = (u ?? "").trim().toLowerCase();
  if (k === "") return "TNE";
  if (["t", "т", "ton", "tone", "tonne", "tons", "tne", "тон", "тона"].includes(k)) return "TNE";
  return (u ?? "").toUpperCase();
}

export function dispatchTotalQuantity(rows: { quantity?: number | null }[]): number {
  return rows.reduce<Prisma.Decimal>((s, r) => s.plus(r.quantity ?? 0), new Prisma.Decimal(0)).toDecimalPlaces(3).toNumber();
}

/**
 * Изгражда данните за конкретен документ от source-а (auto-fill). Връща plain обект,
 * който се пази в ExportDocument.data и после е editable.
 */
export function buildDocumentData(src: ExportSetSource, parties: Parties, docType: ExportDocType): Record<string, unknown> {
  const truck = truckTrailerLabel(src.truckRegSnapshot, src.trailerReg);
  const sellerEn = partyEn(parties.seller);
  const buyerEn = partyEn(parties.buyer);
  const sellerCityEn = (sellerEn.city ?? "").toUpperCase().trim();
  switch (docType) {
    case "invoice":
      return {
        invoiceNumber: src.invoiceNumber, invoiceDate: src.invoiceDate,
        // Английската фирмена версия както в оригинала (§5/§6); presentation only.
        seller: resolveInvoiceParty(sellerEn), buyer: resolveInvoiceParty(buyerEn),
        contract: null, annex: null, order: null,
        // Terms of delivery = „{deliveryTerm} {DEST_EN}" (§9); legacy fallback „FCA {град}".
        termsOfDelivery: invoiceDeliveryTerms(src.deliveryTerm, src.destination, `FCA ${sellerCityEn}`.replace(/\s+/g, " ").trim()),
        // Date of shipment = отделната дата на изпращане (fallback към issue date за legacy записи).
        // Place of shipment = „BELI IZVOR" (заводът), НЕ градът на продавача (§2/§3/§15).
        truck, placeOfShipment: destinationEn(src.placeOfShipment) || PLACE_OF_SHIPMENT_DEFAULT, dateOfShipment: src.shipmentDate ?? src.invoiceDate,
        // Дата на декларацията в Invoice (§18/§21) — от declarationCmrDate (fallback invoiceDate),
        // рендира се YYYY.MM.DD (различно от invoice date). НЕ shipmentDate — тя е само в испратницата (§5).
        declarationDate: src.declarationCmrDate ?? src.invoiceDate,
        destination: destinationEn(src.destination) || src.destination, destinationCountry: buyerEn.country ?? null,
        // Date/City/Manager блок (auto-fill, editable snapshot).
        date: src.invoiceDate, city: sellerCityEn || null, manager: parties.seller.manager ?? null,
        goods: [{ description: src.productSnapshot ? `CEMENT ${src.productSnapshot} - IN BULK` : null, quantity: src.quantity, unit: displayUnitTNE(src.unit), unitPrice: null, value: null, currency: "EUR", certificate: src.certificateNumberSnapshot ?? null }],
        vatText: "Export, Art.28 Bulgarian VAT Legislation", vatRate: 0, vatAmount: 0,
        originText: "ИЗНОСИТЕЛЯТ НА ПРОДУКТИТЕ, ОБХВАНАТИ ОТ ТОЗИ ДОКУМЕНТ, ДЕКЛАРИРА, ЧЕ ОСВЕН КЪДЕТО ЯСНО Е ОТБЕЛЯЗАНО ДРУГО, ТЕЗИ ПРОДУКТИ СА С EU ПРЕФЕРЕНЦИАЛЕН ПРОИЗХОД",
        // Declaration place = СЪЩИЯТ source като „Place of shipment" (§11/§12) → BELI IZVOR.
        originPlace: destinationEn(src.placeOfShipment) || PLACE_OF_SHIPMENT_DEFAULT,
        paymentConditions: "Bank transfer", totalQuantity: src.quantity, totalValue: null, notes: null,
      };
    case "dispatch":
    case "blank": {
      const recipient = docType === "blank" ? null : (parties.client ?? null);
      return {
        // „Денес {дата}" в испратницата = ДАТА НА ИЗПРАЩАНЕ (§4/§28/§29), не invoiceDate.
        dispatchNumber: src.dispatchNumber, date: src.shipmentDate ?? src.invoiceDate,
        // MK фирмата издава испратницата — на кирилица както в оригинала (§3).
        issuer: resolveDispatchIssuer(parties.buyer),
        recipient, destination: src.destination,
        rows: [{ lineNo: 1, truck, material: src.productSnapshot, unit: src.unit || "ТОН", quantity: src.quantity, valueMkd: "по фактура" }],
        totalQuantity: src.quantity,
      };
    }
    case "declaration": {
      // Структурирани променливи (editable) → от тях се съставя текстът (rebuild при промяна).
      const vars: DeclarationVars = {
        declarantName: parties.seller.manager ?? null,
        representedCompany: parties.seller.name,
        proformaNumber: src.holcimProforma?.number ?? null,
        proformaDate: src.holcimProforma?.date ?? null,
        proformaSupplier: PROFORMA_SUPPLIER,
        invoiceNumber: src.invoiceNumber, invoiceDate: src.invoiceDate,
        origin: "BG и EU",
      };
      return {
        regulation: "Регламент – EC №2447/2015, Приложение 22-10", title: "ДЕКЛАРАЦИЯ",
        ...vars, holcim: PROFORMA_SUPPLIER, bgCompany: parties.seller, product: src.productSnapshot,
        // Място/град = град на продавача (напр. „Кюстендил") — както в референцията (§32), editable.
        place: (parties.seller.city ?? "").trim() || null, city: (parties.seller.city ?? "").trim() || null,
        date: src.declarationCmrDate,
        bodyText: buildDeclarationText(vars),
        statementText: DECLARATION_STATEMENT,
      };
    }
    case "cmr_epson":
    case "cmr_hp": {
      const cmrSender = resolveInvoiceParty(sellerEn);
      const cmrBuyer = resolveInvoiceParty(buyerEn);
      const cmrCity = (cmrSender.city ?? sellerCityEn ?? "").toUpperCase();
      // И двата CMR overlay-а (Epson/HP) ползват едни и същи presentation defaults (§2/§3/§17).
      return {
        layout: docType === "cmr_epson" ? "epson" : "hp",
        sender: cmrSender, consignee: cmrBuyer,
        // CMR defaults (editable): дестинация „SKOPIE", държава „NORTH MACEDONIA", спедитор „ENIGMA".
        destination: "SKOPIE",
        placeOfShipment: [cmrCity, (cmrSender.country ?? "").toUpperCase()].filter(Boolean).join(", "),
        // CMR транспортна дата = дата на изпращане (fallback CMR/деклар. → issue), §8/§13.
        date: src.shipmentDate ?? src.declarationCmrDate ?? src.invoiceDate,
        invoiceDate: src.invoiceDate,
        destinationCountry: "NORTH MACEDONIA",
        placeBottom: cmrCity || null,
        truck, invoiceNumber: src.invoiceNumber,
        goods: { description: src.productSnapshot ? `CEMENT Holcim ${src.productSnapshot} - IN BULK` : "CEMENT", customsCode: src.customsCode ?? null, certificate: src.certificateNumberSnapshot ?? null },
        quantity: src.quantity, weightKg: kgFromTonnes(src.quantity), speditor: "ENIGMA",
      };
    }
  }
}
