"use client";
import { goodsRowValue, invoiceTotals, displayUnitTNE } from "@/lib/logistics/exportDocs";
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

// Дата dd.mm.yyyy; количество с точка (английски invoice, §13) 3 знака; пари 2 знака + „€".
const d = (s?: string | null) => s ? new Date(s).toLocaleDateString("en-GB") : "";
const yearOf = (s?: string | null) => s ? String(new Date(s).getFullYear()) : "";
const nfQty = new Intl.NumberFormat("en-US", { minimumFractionDigits: 3, maximumFractionDigits: 3 });
const q3 = (v?: number | null) => v == null ? "" : nfQty.format(v);
const nfMoney = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const eur = (v?: number | null) => v == null ? "" : `${nfMoney.format(v)} €`;
const nfBg2 = new Intl.NumberFormat("bg-BG", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const bg2 = (v?: number | null) => nfBg2.format(v ?? 0);
const lineValue = (g: Goods) => goodsRowValue(g);

export function ExportInvoiceTemplate({ data }: { data: InvoiceDocData }) {
  const seller = resolveInvoiceParty(data.seller);
  const buyer = resolveInvoiceParty(data.buyer);
  const goods = (data.goods ?? []).length ? data.goods! : [{}];
  const { quantity: totalQ, value: totalV } = invoiceTotals(goods);

  // Means of transport: един камион при стандартния случай; при повече от една доставка —
  // компактно изброяване на различните регистрации (§8/§12), без да чупи layout-а.
  const trucks = Array.from(new Set([data.truck, ...goods.map((g) => g.truck)].filter(Boolean))) as string[];
  const truckText = trucks.length ? trucks.join(", ") : (data.truck ?? "");

  const B = "1px solid #000";
  const cell: React.CSSProperties = { border: B, padding: "3px 6px", fontSize: 11, verticalAlign: "top" };
  const rcell: React.CSSProperties = { ...cell, textAlign: "right", whiteSpace: "nowrap" };
  const label: React.CSSProperties = { fontSize: 11 };
  const val: React.CSSProperties = { fontWeight: 700 };
  const party = (p: Party) => (
    <div style={{ lineHeight: 1.3 }}>
      <div style={{ fontWeight: 700 }}>{p?.name ?? ""}</div>
      <div>{p?.address ?? ""}</div>
      <div>{[p?.city, p?.country].filter(Boolean).join(", ")}</div>
    </div>
  );
  const declaration = (data.originText ?? "").trim();

  return (
    <div className="printable invoice-doc" style={{ fontFamily: "'Times New Roman', Times, serif", color: "#000", background: "#fff", width: "100%", boxSizing: "border-box", padding: "8mm 10mm", fontSize: 11.5, lineHeight: 1.3 }}>
      {/* Заглавие (§4) */}
      <div style={{ display: "flex", justifyContent: "center", alignItems: "baseline", gap: 8, fontWeight: 700, fontSize: 16, marginBottom: 12 }}>
        <span>INVOICE №</span><span>{data.invoiceNumber ?? ""}</span>{yearOf(data.invoiceDate) && <><span>/</span><span>{yearOf(data.invoiceDate)}</span></>}
      </div>

      {/* Seller | Contract/Anex/Order (§5) */}
      <div style={{ display: "flex", marginBottom: 8 }}>
        <div style={{ width: "58%" }}>
          <div style={{ fontWeight: 700 }}>Seller</div>
          {party(seller)}
        </div>
        <div style={{ width: "42%", lineHeight: 1.5 }}>
          <div>Contract : <span style={val}>{data.contract ?? ""}</span></div>
          <div>Anex № <span style={val}>{data.annex ?? ""}</span></div>
          <div>Order № <span style={val}>{data.order ?? ""}</span></div>
        </div>
      </div>

      {/* Consignee | Buyer / importer (§6) */}
      <div style={{ display: "flex", marginBottom: 10 }}>
        <div style={{ width: "58%" }}>
          <div style={{ fontWeight: 700 }}>Consignee</div>
          {party(buyer)}
        </div>
        <div style={{ width: "42%" }}>
          <div style={{ fontWeight: 700 }}>Buyer / importer /</div>
          {party(buyer)}
        </div>
      </div>

      {/* Delivery / transport (§7) */}
      <div style={{ marginBottom: 10, lineHeight: 1.5 }}>
        <div><span style={label}>Terms of delivery :&nbsp;&nbsp;&nbsp;</span><span style={val}>{data.termsOfDelivery ?? ""}</span></div>
        <div><span style={label}>Means of transport :&nbsp;&nbsp;</span>Truck № : <span style={val}>{truckText}</span></div>
        <div><span style={label}>Place of shipment :&nbsp;&nbsp;&nbsp;</span><span style={val}>{data.placeOfShipment ?? ""}</span></div>
        <div><span style={label}>Date of shipment :&nbsp;&nbsp;&nbsp;</span><span style={val}>{d(data.dateOfShipment)}</span></div>
        <div><span style={label}>Destination :&nbsp;&nbsp;&nbsp;</span><span style={val}>{[data.destination, data.destinationCountry].filter(Boolean).join("  ")}</span></div>
      </div>

      {/* Goods box: продукти + декларация + място/представител + VAT + TOTAL (§9,§16-19) */}
      <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
        <colgroup>
          <col style={{ width: "58%" }} /><col style={{ width: "16%" }} /><col style={{ width: "12%" }} /><col style={{ width: "14%" }} />
        </colgroup>
        <thead>
          <tr>
            <th style={{ ...cell, textAlign: "left", fontWeight: 700 }}>Description of goods<br /><span style={{ fontWeight: 400, fontSize: 10 }}>Number and kind of packages</span></th>
            <th style={{ ...cell, textAlign: "center", fontWeight: 700 }}>Quantity<br />TNE</th>
            <th style={{ ...cell, textAlign: "center", fontWeight: 700 }}>Unit price<br />EUR</th>
            <th style={{ ...cell, textAlign: "center", fontWeight: 700 }}>Value<br />EUR</th>
          </tr>
        </thead>
        <tbody>
          {goods.map((g, i) => (
            <tr key={i}>
              <td style={{ ...cell, textAlign: "left" }}>
                {g.description ?? ""}
                {g.certificate ? <div>(Certificate No {g.certificate})</div> : null}
                {g.truck && trucks.length > 1 ? <div style={{ fontSize: 10 }}>Truck № : {g.truck}</div> : null}
                {g.note ? <div style={{ fontSize: 10 }}>{g.note}</div> : null}
              </td>
              <td style={rcell}>{q3(g.quantity)}</td>
              <td style={rcell}>{eur(g.unitPrice)}</td>
              <td style={rcell}>{eur(lineValue(g))}</td>
            </tr>
          ))}
          {/* Декларация + място/представител в описателната зона (§16-17) */}
          <tr>
            <td style={{ ...cell, height: 90 }}>
              {declaration && <div style={{ fontSize: 10.5, whiteSpace: "pre-line" }}>{declaration}</div>}
              <div style={{ marginTop: 14 }}>{data.originPlace ?? data.placeOfShipment ?? ""}</div>
              <div style={{ fontWeight: 700 }}>{data.manager ?? ""}</div>
            </td>
            <td style={cell}></td><td style={cell}></td><td style={cell}></td>
          </tr>
          {/* VAT (§18) */}
          <tr>
            <td style={{ ...cell, textAlign: "left" }}>{data.vatText ?? ""}</td>
            <td style={cell}></td>
            <td style={{ ...cell, textAlign: "right" }}>VAT {bg2(data.vatRate)} %</td>
            <td style={{ ...cell, textAlign: "right" }}>{bg2(0)}</td>
          </tr>
          {/* TOTAL (§19) */}
          <tr>
            <td style={{ ...cell, textAlign: "right", fontWeight: 700 }}>TOTAL :</td>
            <td style={{ ...rcell, fontWeight: 700 }}>{q3(totalQ)}</td>
            <td style={cell}></td>
            <td style={{ ...rcell, fontWeight: 700 }}>{eur(totalV)}</td>
          </tr>
        </tbody>
      </table>

      {/* Payment (§21) */}
      <div style={{ marginTop: 10 }}>Payment conditions :&nbsp;&nbsp;<span style={val}>{data.paymentConditions ?? ""}</span></div>

      {/* Seller / signature (§22) */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 22 }}>
        <div style={{ width: 220, textAlign: "center" }}>
          <div style={{ textAlign: "left" }}>Seller :</div>
          <div style={{ marginTop: 16, borderTop: B }} />
          <div style={{ fontSize: 10 }}>/ Sign. &amp; Stamp /</div>
        </div>
      </div>
    </div>
  );
}
