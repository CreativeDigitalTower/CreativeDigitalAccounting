"use client";
import { goodsRowValue, invoiceTotals } from "@/lib/logistics/exportDocs";
import { resolveInvoiceParty } from "@/lib/logistics/invoiceParties";

type Party = { name?: string | null; address?: string | null; city?: string | null; country?: string | null; eik?: string | null; registrationNumber?: string | null; vatNumber?: string | null };
type Goods = { description?: string | null; quantity?: number | null; unit?: string | null; unitPrice?: number | null; value?: number | null; currency?: string | null; certificate?: string | null; truck?: string | null; note?: string | null };
export type InvoiceDocData = {
  invoiceNumber?: string | null; invoiceDate?: string | null; seller?: Party; buyer?: Party;
  contract?: string | null; annex?: string | null; order?: string | null;
  termsOfDelivery?: string | null; truck?: string | null; placeOfShipment?: string | null; dateOfShipment?: string | null;
  destination?: string | null; destinationCountry?: string | null; goods?: Goods[];
  vatText?: string | null; vatRate?: number | null; originText?: string | null; originPlace?: string | null;
  paymentConditions?: string | null; certificatesText?: string | null; notes?: string | null;
  date?: string | null; city?: string | null; manager?: string | null;
};

// Декларацията (§12/§15) — ТОЧНО 4 реда, explicit line breaks (не разчитаме на wrapping).
const DECLARATION = [
  "ИЗНОСИТЕЛЯТ НА ПРОДУКТИТЕ, ОБХВАНАТИ",
  "ОТ ТОЗИ ДОКУМЕНТ, ДЕКЛАРИРА, ЧЕ ОСВЕН",
  "КЪДЕТО ЯСНО Е ОТБЕЛЯЗАНО ДРУГО, ТЕЗИ",
  "ПРОДУКТИ СА С EU ПРЕФЕРЕНЦИАЛЕН ПРОИЗХОД",
];

const d = (s?: string | null) => s ? new Date(s).toLocaleDateString("en-GB") : "";
const yearOf = (s?: string | null) => s ? String(new Date(s).getFullYear()) : "";
// Номер за показване: без излишни водещи нули (0000009654 → 9654), ако е чисто число (§3).
const dispNo = (n?: string | null) => { const s = (n ?? "").trim(); return /^\d+$/.test(s) ? String(Number(s)) : s; };
const nfQty = new Intl.NumberFormat("en-US", { minimumFractionDigits: 3, maximumFractionDigits: 3 });
const q3 = (v?: number | null) => v == null ? "" : nfQty.format(v);
const nfMoney = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const eur = (v?: number | null) => v == null ? "" : `${nfMoney.format(v)} €`;
const nfBg2 = new Intl.NumberFormat("bg-BG", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const bg2 = (v?: number | null) => nfBg2.format(v ?? 0);
const lineValue = (g: Goods) => goodsRowValue(g);

// Град + държава без дублиране (§7): ако градът вече съдържа държавата, не я добавяме пак.
function cityCountry(p?: Party): string {
  const city = (p?.city ?? "").trim();
  const country = (p?.country ?? "").trim();
  if (!country) return city;
  if (!city) return country;
  const norm = (s: string) => s.toLowerCase().replace(/[.,]/g, "").trim();
  if (norm(city).includes(norm(country))) return city;
  return `${city}, ${country}`;
}

export function ExportInvoiceTemplate({ data }: { data: InvoiceDocData }) {
  const seller = resolveInvoiceParty(data.seller);
  const buyer = resolveInvoiceParty(data.buyer);
  const goods = (data.goods ?? []).length ? data.goods! : [{}];
  const { quantity: totalQ, value: totalV } = invoiceTotals(goods);
  const trucks = Array.from(new Set([data.truck, ...goods.map((g) => g.truck)].filter(Boolean))) as string[];
  const truckText = trucks.length ? trucks.join(", ") : (data.truck ?? "");
  const representative = (data.manager ?? "").toUpperCase();

  const B = "1px solid #000";
  const partyBlock = (p: Party, title: string) => (
    <>
      <div style={{ fontStyle: "italic" }}>{title}</div>
      <div style={{ fontWeight: 700 }}>{p?.name ?? ""}</div>
      <div>{p?.address ?? ""}</div>
      <div>{cityCountry(p)}</div>
    </>
  );
  const gcell: React.CSSProperties = { border: B, padding: "2px 6px", fontSize: 11, verticalAlign: "top" };
  const gnum: React.CSSProperties = { ...gcell, textAlign: "right", whiteSpace: "nowrap", verticalAlign: "top" };
  const lab: React.CSSProperties = { display: "inline-block", width: 44 };

  return (
    // Точна A4 геометрия (§1,§2,§21): print area A1:J48, margins L8/R6/T8/B9, ~ пълна страница.
    <div className="printable invoice-doc" style={{ fontFamily: "'Times New Roman', Times, serif", color: "#000", background: "#fff", width: "210mm", height: "297mm", boxSizing: "border-box", padding: "8mm 6mm 9mm 8mm", fontSize: 11.5, lineHeight: 1.15, display: "flex", flexDirection: "column" }}>
      {/* Заглавие (§3) */}
      <div style={{ display: "flex", justifyContent: "center", alignItems: "baseline", gap: 8, fontWeight: 700, fontSize: 15, height: "12mm" }}>
        <span>INVOICE №</span><span>{dispNo(data.invoiceNumber)}</span>{yearOf(data.invoiceDate) && <><span>/</span><span>{yearOf(data.invoiceDate)}</span></>}
      </div>

      {/* Горни boxed блокове: Seller|Contract, Consignee|Buyer (§4) */}
      <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
        <tbody>
          <tr>
            <td style={{ border: B, padding: "3px 8px", width: "56%", height: "23mm", verticalAlign: "top" }}>{partyBlock(seller, "Seller")}</td>
            <td style={{ border: B, padding: "3px 8px", verticalAlign: "top" }}>
              <div style={{ lineHeight: 1.6 }}>
                <div>Contract : <b>{data.contract ?? ""}</b></div>
                <div>Anex № <b>{data.annex ?? ""}</b></div>
                <div>Order № <b>{data.order ?? ""}</b></div>
              </div>
            </td>
          </tr>
          <tr>
            <td style={{ border: B, padding: "3px 8px", height: "23mm", verticalAlign: "top" }}>{partyBlock(buyer, "Consignee")}</td>
            <td style={{ border: B, padding: "3px 8px", verticalAlign: "top" }}>{partyBlock(buyer, "Buyer / importer /")}</td>
          </tr>
        </tbody>
      </table>

      {/* Delivery / transport (§8) */}
      <div style={{ height: "34mm", paddingTop: "4mm", lineHeight: 1.9 }}>
        <div><span style={{ display: "inline-block", width: 150 }}>Terms of delivery :</span><b>{data.termsOfDelivery ?? ""}</b></div>
        <div><span style={{ display: "inline-block", width: 150 }}>Means of transport :</span>Truck № : <b>{truckText}</b></div>
        <div><span style={{ display: "inline-block", width: 150 }}>Place of shipment :</span><b>{data.placeOfShipment ?? ""}</b></div>
        <div><span style={{ display: "inline-block", width: 150 }}>Date of shipment :</span><b>{d(data.dateOfShipment)}</b></div>
        <div><span style={{ display: "inline-block", width: 150 }}>Destination :</span><b>{data.destination ?? ""}</b>{data.destinationCountry ? <>&nbsp;&nbsp;&nbsp;{data.destinationCountry}</> : null}</div>
      </div>

      {/* Голяма goods зона: продукти + декларация + BELI IZVOR + представител + VAT + празен ред + TOTAL (§9,§16-19) */}
      <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed", height: "122mm" }}>
        <colgroup>
          <col style={{ width: "56%" }} /><col style={{ width: "16%" }} /><col style={{ width: "13%" }} /><col style={{ width: "15%" }} />
        </colgroup>
        <thead>
          <tr style={{ height: "13mm" }}>
            <th style={{ ...gcell, textAlign: "left", fontWeight: 700, verticalAlign: "middle" }}>Description of goods<br /><span style={{ fontWeight: 400, fontSize: 10 }}>Number and kind of packages</span></th>
            <th style={{ ...gcell, textAlign: "center", fontWeight: 700, verticalAlign: "middle" }}>Quantity<br />TNE</th>
            <th style={{ ...gcell, textAlign: "center", fontWeight: 700, verticalAlign: "middle" }}>Unit price<br />EUR</th>
            <th style={{ ...gcell, textAlign: "center", fontWeight: 700, verticalAlign: "middle" }}>Value<br />EUR</th>
          </tr>
        </thead>
        <tbody>
          {goods.map((g, i) => (
            <tr key={i} style={{ height: "7mm" }}>
              <td style={{ ...gcell }}>
                <span style={{ fontWeight: 700 }}>{g.description ?? ""}</span>
                {g.certificate ? <div style={{ fontWeight: 400 }}>(Certificate No {g.certificate})</div> : null}
                {g.truck && trucks.length > 1 ? <div style={{ fontSize: 10 }}>Truck № : {g.truck}</div> : null}
              </td>
              <td style={{ ...gnum, fontWeight: 700 }}>{q3(g.quantity)}</td>
              <td style={{ ...gnum, fontWeight: 700 }}>{eur(g.unitPrice)}</td>
              <td style={{ ...gnum, fontWeight: 700 }}>{eur(lineValue(g))}</td>
            </tr>
          ))}
          {/* Декларация + BELI IZVOR + представител — заема свободното вертикално пространство (§13-15) */}
          <tr>
            <td style={{ ...gcell }}>
              <div style={{ fontSize: 10.5, marginTop: "6mm" }}>
                {DECLARATION.map((ln, i) => <div key={i}>{ln}</div>)}
              </div>
              <div style={{ display: "flex", marginTop: "12mm" }}>
                <span style={{ width: "45%" }}>{data.originPlace && data.originPlace !== data.placeOfShipment ? data.originPlace : ""}</span>
                <span>{data.placeOfShipment ?? ""}</span>
              </div>
              <div style={{ fontWeight: 700 }}>{representative}</div>
            </td>
            <td style={gcell} /><td style={gcell} /><td style={gcell} />
          </tr>
          {/* VAT (§16) */}
          <tr style={{ height: "12mm" }}>
            <td style={{ ...gcell, verticalAlign: "middle" }}>{data.vatText ?? ""}</td>
            <td style={gcell} />
            <td style={{ ...gcell, textAlign: "right", verticalAlign: "middle" }}>VAT {bg2(data.vatRate)} %</td>
            <td style={{ ...gcell, textAlign: "right", verticalAlign: "middle" }}>{bg2(0)}</td>
          </tr>
          {/* Празен bordered ред преди TOTAL (§8/§17) */}
          <tr style={{ height: "7mm" }}>
            <td style={gcell} /><td style={gcell} /><td style={gcell} /><td style={gcell} />
          </tr>
          {/* TOTAL (§18) */}
          <tr style={{ height: "8mm" }}>
            <td style={{ ...gcell, textAlign: "right", fontWeight: 700, verticalAlign: "middle" }}>TOTAL :</td>
            <td style={{ ...gnum, fontWeight: 700, verticalAlign: "middle" }}>{q3(totalQ)}</td>
            <td style={{ ...gcell, verticalAlign: "middle" }} />
            <td style={{ ...gnum, fontWeight: 700, verticalAlign: "middle" }}>{eur(totalV)}</td>
          </tr>
        </tbody>
      </table>

      {/* Payment conditions — по-ниско (§10/§19) */}
      <div style={{ paddingTop: "11mm" }}>
        <span style={{ fontStyle: "italic", textDecoration: "underline" }}>Payment conditions :</span>&nbsp;&nbsp;<b>{data.paymentConditions ?? ""}</b>
      </div>

      {/* Seller / signature — долу вдясно (§11/§20) */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "auto" }}>
        <div style={{ width: "62mm", textAlign: "center" }}>
          <div style={{ textAlign: "left" }}>Seller :</div>
          <div style={{ marginTop: "10mm", borderTop: B }} />
          <div style={{ fontSize: 10 }}>/ Sign. &amp; Stamp /</div>
        </div>
      </div>
    </div>
  );
}
