"use client";
import { goodsRowValue, invoiceTotals } from "@/lib/logistics/exportDocs";
import { resolveInvoiceParty } from "@/lib/logistics/invoiceParties";
import { formatInvoiceDate, formatDeclarationDate } from "@/lib/logistics/exportDates";

type Party = { name?: string | null; address?: string | null; city?: string | null; country?: string | null; eik?: string | null; registrationNumber?: string | null; vatNumber?: string | null };
type Goods = { description?: string | null; quantity?: number | null; unit?: string | null; unitPrice?: number | null; value?: number | null; currency?: string | null; certificate?: string | null; truck?: string | null; note?: string | null };
export type InvoiceDocData = {
  invoiceNumber?: string | null; invoiceDate?: string | null; seller?: Party; buyer?: Party;
  contract?: string | null; annex?: string | null; order?: string | null;
  termsOfDelivery?: string | null; truck?: string | null; placeOfShipment?: string | null; dateOfShipment?: string | null;
  declarationDate?: string | null;
  destination?: string | null; destinationCountry?: string | null; goods?: Goods[];
  vatText?: string | null; vatRate?: number | null; originText?: string | null; originPlace?: string | null;
  paymentConditions?: string | null; certificatesText?: string | null; notes?: string | null;
  date?: string | null; city?: string | null; manager?: string | null;
};

// Декларацията — ТОЧНО 4 реда, explicit line breaks (не разчитаме на wrapping).
const DECLARATION = [
  "ИЗНОСИТЕЛЯТ НА ПРОДУКТИТЕ, ОБХВАНАТИ",
  "ОТ ТОЗИ ДОКУМЕНТ, ДЕКЛАРИРА, ЧЕ ОСВЕН",
  "КЪДЕТО ЯСНО Е ОТБЕЛЯЗАНО ДРУГО, ТЕЗИ",
  "ПРОДУКТИ СА С EU ПРЕФЕРЕНЦИАЛЕН ПРОИЗХОД",
];

// Invoice date → DD.MM.YYYY (централен helper, §27/§28).
const d = (s?: string | null) => formatInvoiceDate(s);
const nfQty = new Intl.NumberFormat("en-US", { minimumFractionDigits: 3, maximumFractionDigits: 3 });
const q3 = (v?: number | null) => v == null ? "" : nfQty.format(v);
const nfMoney = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const eur = (v?: number | null) => v == null ? "" : `${nfMoney.format(v)} €`;
const nfBg2 = new Intl.NumberFormat("bg-BG", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const bg2 = (v?: number | null) => nfBg2.format(v ?? 0);
const lineValue = (g: Goods) => goodsRowValue(g);

// Град + държава без дублиране (§26): ако градът вече съдържа държавата, не я добавяме пак.
function cityCountry(p?: Party): string {
  const city = (p?.city ?? "").trim();
  const country = (p?.country ?? "").trim();
  if (!country) return city;
  if (!city) return country;
  const norm = (s: string) => s.toLowerCase().replace(/[.,]/g, "").trim();
  if (norm(city).includes(norm(country))) return city;
  return `${city}, ${country}`;
}

/**
 * BG Export Invoice — 1:1 по клиентския Invocieee.xlsx.pdf (§1-§12/§25/§42):
 * ЕДНА непрекъсната външна рамка (един border-collapse `<table>`) от Seller до подпис/печат;
 * Terms и Payment/Signature са ВЪТРЕ в рамката; вертикалните разделители на числовите
 * колони продължават през декларацията до TOTAL. Побира се на ЕДНА A4 страница (§13/§14):
 * фиксирани mm височини сумиращи под printable area + `height:297mm; overflow:hidden` +
 * box-sizing:border-box (§17-§20). Screen/PDF/Print ползват този единствен layout (§24).
 */
export function ExportInvoiceTemplate({ data }: { data: InvoiceDocData }) {
  const seller = resolveInvoiceParty(data.seller);
  const buyer = resolveInvoiceParty(data.buyer);
  const goods = (data.goods ?? []).length ? data.goods! : [{}];
  const first = goods[0];
  const { quantity: totalQ, value: totalV } = invoiceTotals(goods);
  const trucks = Array.from(new Set([data.truck, ...goods.map((g) => g.truck)].filter(Boolean))) as string[];
  const truckText = trucks.length ? trucks.join(", ") : (data.truck ?? "");
  const representative = (data.manager ?? "").toUpperCase();

  const B = "1px solid #000";
  const cell: React.CSSProperties = { border: B, padding: "3px 8px", fontSize: 11.5, verticalAlign: "top" };
  const num: React.CSSProperties = { ...cell, textAlign: "right", whiteSpace: "nowrap" };
  const lab: React.CSSProperties = { display: "inline-block", width: 148, fontStyle: "italic" };
  const party = (p: Party, title: string) => (
    <>
      <div style={{ fontStyle: "italic" }}>{title}</div>
      <div style={{ fontWeight: 700 }}>{p?.name ?? ""}</div>
      <div>{p?.address ?? ""}</div>
      <div>{cityCountry(p)}</div>
    </>
  );

  return (
    <div className="printable invoice-doc" style={{ fontFamily: "'Times New Roman', Times, serif", color: "#000", background: "#fff", width: "210mm", height: "297mm", boxSizing: "border-box", padding: "6mm 6mm 6mm 8mm", fontSize: 11.5, lineHeight: 1.2, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Заглавие над рамката: INVOICE № {точен номер, водещи нули} / {DD.MM.YYYY} (§28) */}
      <div style={{ display: "flex", justifyContent: "center", alignItems: "baseline", gap: 8, fontWeight: 700, fontSize: 14, padding: "1mm 0 3mm" }}>
        <span>INVOICE №</span><span>{data.invoiceNumber ?? ""}</span>{data.invoiceDate && <><span>/</span><span>{d(data.invoiceDate)}</span></>}
      </div>

      {/* ЕДНА рамка за целия документ (§3/§33): border-collapse table с 4 колони 56/16/13/15. */}
      <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
        <colgroup>
          <col style={{ width: "56%" }} /><col style={{ width: "16%" }} /><col style={{ width: "13%" }} /><col style={{ width: "15%" }} />
        </colgroup>
        <tbody>
          {/* Seller | Contract */}
          <tr style={{ height: "22mm" }}>
            <td style={cell}>{party(seller, "Seller")}</td>
            <td style={cell} colSpan={3}>
              <div style={{ lineHeight: 1.7 }}>
                <div><i>Contract :</i> <b>{data.contract ?? ""}</b></div>
                <div><i>Anex №</i> <b>{data.annex ?? ""}</b></div>
                <div><i>Order №</i> <b>{data.order ?? ""}</b></div>
              </div>
            </td>
          </tr>
          {/* Consignee | Buyer */}
          <tr style={{ height: "22mm" }}>
            <td style={cell}>{party(buyer, "Consignee")}</td>
            <td style={cell} colSpan={3}>{party(buyer, "Buyer / importer /")}</td>
          </tr>
          {/* Terms — ВЪТРЕ в рамката, full width, без вътрешни хоризонтални линии (§2/§4) */}
          <tr style={{ height: "28mm" }}>
            <td style={{ ...cell, lineHeight: 1.9 }} colSpan={4}>
              <div><span style={lab}>Terms of delivery :</span><b>{data.termsOfDelivery ?? ""}</b></div>
              <div><span style={lab}>Means of transport :</span>Truck № : <b>{truckText}</b></div>
              <div><span style={lab}>Place of shipment :</span><b>{data.placeOfShipment ?? ""}</b></div>
              <div><span style={lab}>Destination :</span><b>{data.destination ?? ""}</b>{data.destinationCountry ? <>&nbsp;&nbsp;&nbsp;{data.destinationCountry}</> : null}</div>
            </td>
          </tr>
          {/* Goods header (§6) */}
          <tr style={{ height: "12mm" }}>
            <td style={{ ...cell, textAlign: "center", fontWeight: 700, verticalAlign: "middle" }}>Description of goods<br /><span style={{ fontWeight: 400, fontSize: 10.5 }}>Number and kind of packages</span></td>
            <td style={{ ...cell, textAlign: "center", fontWeight: 700, verticalAlign: "middle" }}>Quantity<br /><span style={{ fontWeight: 400 }}>TNE</span></td>
            <td style={{ ...cell, textAlign: "center", fontWeight: 700, verticalAlign: "middle" }}>Unit price<br /><span style={{ fontWeight: 400 }}>EUR</span></td>
            <td style={{ ...cell, textAlign: "center", fontWeight: 700, verticalAlign: "middle" }}>Value<br /><span style={{ fontWeight: 400 }}>EUR</span></td>
          </tr>
          {/* Продукт + декларация — ЕДИН висок ред; числата top-aligned, вертикалите продължават (§32) */}
          <tr style={{ height: "104mm" }}>
            <td style={cell}>
              <div style={{ fontWeight: 700 }}>{first.description ?? ""}</div>
              {first.certificate ? <div style={{ textAlign: "center" }}>(Certificate No {first.certificate})</div> : null}
              <div style={{ marginTop: "7mm", fontSize: 10.5, fontWeight: 700 }}>
                {DECLARATION.map((ln, i) => <div key={i}>{ln}</div>)}
              </div>
              <div style={{ display: "flex", marginTop: "8mm", fontWeight: 700 }}>
                <span style={{ width: "42%" }}>{formatDeclarationDate(data.declarationDate ?? data.invoiceDate)}</span>
                <span>{data.placeOfShipment ?? ""}</span>
              </div>
              <div style={{ fontWeight: 700 }}>{representative}</div>
            </td>
            <td style={{ ...num, fontWeight: 700 }}>{q3(first.quantity)}</td>
            <td style={{ ...num, fontWeight: 700 }}>{eur(first.unitPrice)}</td>
            <td style={{ ...num, fontWeight: 700 }}>{eur(lineValue(first))}</td>
          </tr>
          {/* VAT (§9): текст | „VAT x %" (colSpan 2, center) | стойност */}
          <tr style={{ height: "9mm" }}>
            <td style={{ ...cell, verticalAlign: "middle", fontWeight: 700, textAlign: "center" }}>{data.vatText ?? ""}</td>
            <td style={{ ...cell, verticalAlign: "middle", textAlign: "center", fontWeight: 700 }} colSpan={2}>VAT {bg2(data.vatRate)} %</td>
            <td style={{ ...num, verticalAlign: "middle", fontWeight: 700 }}>{bg2(0)}</td>
          </tr>
          {/* Празен ред (§9) */}
          <tr style={{ height: "7mm" }}>
            <td style={cell} /><td style={cell} /><td style={cell} /><td style={cell} />
          </tr>
          {/* TOTAL — вътре в grid-а, изцяло очертан (§7/§8) */}
          <tr style={{ height: "9mm" }}>
            <td style={{ ...cell, textAlign: "right", fontWeight: 700, verticalAlign: "middle" }}>TOTAL :</td>
            <td style={{ ...num, fontWeight: 700, verticalAlign: "middle" }}>{q3(totalQ)}</td>
            <td style={{ ...cell, verticalAlign: "middle" }} />
            <td style={{ ...num, fontWeight: 700, verticalAlign: "middle" }}>{eur(totalV)}</td>
          </tr>
          {/* Payment conditions + Seller/Sign & Stamp — ВЪТРЕ в долната част на рамката (§10/§11/§12) */}
          <tr style={{ height: "42mm" }}>
            <td style={{ ...cell, position: "relative" }} colSpan={4}>
              <div style={{ marginTop: "3mm" }}>
                <span style={{ fontStyle: "italic", textDecoration: "underline" }}>Payment conditions :</span>&nbsp;&nbsp;<b>{data.paymentConditions ?? ""}</b>
              </div>
              <div style={{ marginTop: "16mm", marginLeft: "46%", textAlign: "center" }}>
                <div style={{ textAlign: "left" }}>Seller :</div>
                <div style={{ marginTop: "9mm" }}>/ Sign. &amp; Stamp /</div>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
