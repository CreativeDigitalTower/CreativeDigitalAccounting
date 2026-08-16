"use client";
import { companyIdentifier } from "@/lib/company/identifier";
import { goodsRowValue, invoiceTotals } from "@/lib/logistics/exportDocs";

type Party = { name?: string | null; address?: string | null; city?: string | null; country?: string | null; eik?: string | null; registrationNumber?: string | null; vatNumber?: string | null };
type Goods = { description?: string | null; quantity?: number | null; unit?: string | null; unitPrice?: number | null; value?: number | null; currency?: string | null; certificate?: string | null };
export type InvoiceDocData = {
  invoiceNumber?: string | null; invoiceDate?: string | null; seller?: Party; buyer?: Party;
  contract?: string | null; annex?: string | null; order?: string | null;
  termsOfDelivery?: string | null; truck?: string | null; placeOfShipment?: string | null; dateOfShipment?: string | null;
  destination?: string | null; destinationCountry?: string | null; goods?: Goods[];
  vatText?: string | null; vatRate?: number | null; originText?: string | null; originPlace?: string | null;
  paymentConditions?: string | null; certificatesText?: string | null; notes?: string | null;
  date?: string | null; city?: string | null; manager?: string | null;
};

const d = (s?: string | null) => s ? new Date(s).toLocaleDateString("bg-BG") : "";
const n2 = (v?: number | null) => v == null ? "" : v.toFixed(2);
const n3 = (v?: number | null) => v == null ? "" : v.toFixed(3);
const lineValue = (g: Goods) => goodsRowValue(g);

function idText(p?: Party) { if (!p) return ""; const id = companyIdentifier(p); return id ? `${id.kind === "eik" ? "ЕИК" : "Reg.No"} ${id.value}` : ""; }

export function ExportInvoiceTemplate({ data }: { data: InvoiceDocData }) {
  const goods = data.goods ?? [];
  const { quantity: totalQ, value: totalV } = invoiceTotals(goods);
  const box: React.CSSProperties = { border: "1px solid #000", padding: "6px 8px" };
  const cell: React.CSSProperties = { border: "1px solid #000", padding: "4px 6px", fontSize: 12 };
  return (
    <div className="printable" style={{ fontFamily: "Arial, sans-serif", color: "#000", background: "#fff", width: 720, margin: "0 auto", padding: 20, fontSize: 12.5, lineHeight: 1.45 }}>
      <div style={{ textAlign: "center", fontWeight: 700, fontSize: 18, marginBottom: 4 }}>INVOICE № {data.invoiceNumber ?? ""} / {d(data.invoiceDate)}</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
        <div style={box}>
          <div style={{ fontWeight: 700 }}>Seller</div>
          <div>{data.seller?.name}</div><div>{data.seller?.address}</div><div>{[data.seller?.city, data.seller?.country].filter(Boolean).join(", ")}</div>
          <div>{idText(data.seller)}{data.seller?.vatNumber ? ` · VAT ${data.seller.vatNumber}` : ""}</div>
        </div>
        <div style={box}>
          <div>Contract: {data.contract ?? ""}</div><div>Anex №: {data.annex ?? ""}</div><div>Order №: {data.order ?? ""}</div>
        </div>
        <div style={{ ...box, gridColumn: "1 / -1" }}>
          <div style={{ fontWeight: 700 }}>Consignee / Buyer</div>
          <div>{data.buyer?.name}</div><div>{data.buyer?.address}</div><div>{[data.buyer?.city, data.buyer?.country].filter(Boolean).join(", ")}</div>
          <div>{idText(data.buyer)}{data.buyer?.vatNumber ? ` · VAT ${data.buyer.vatNumber}` : ""}</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2px 16px", marginBottom: 10 }}>
        <div>Terms of delivery: <b>{data.termsOfDelivery ?? ""}</b></div>
        <div>Means of transport / Truck №: <b>{data.truck ?? ""}</b></div>
        <div>Place of shipment: <b>{data.placeOfShipment ?? ""}</b></div>
        <div>Date of shipment: <b>{d(data.dateOfShipment)}</b></div>
        <div>Destination: <b>{[data.destination, data.destinationCountry].filter(Boolean).join(", ")}</b></div>
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 8 }}>
        <thead><tr>
          <th style={{ ...cell, textAlign: "left" }}>Description of goods</th><th style={cell}>Quantity<br />TNE</th><th style={cell}>Unit price<br />EUR</th><th style={cell}>Value<br />EUR</th>
        </tr></thead>
        <tbody>
          {goods.map((g, i) => (
            <tr key={i}>
              <td style={{ ...cell, textAlign: "left" }}>{g.description}{g.certificate ? <div style={{ fontSize: 10.5 }}>({g.certificate})</div> : null}</td>
              <td style={{ ...cell, textAlign: "right" }}>{n3(g.quantity)}</td>
              <td style={{ ...cell, textAlign: "right" }}>{n2(g.unitPrice)}</td>
              <td style={{ ...cell, textAlign: "right" }}>{n2(lineValue(g))}</td>
            </tr>
          ))}
          <tr>
            <td style={{ ...cell, textAlign: "right", fontWeight: 700 }}>TOTAL:</td>
            <td style={{ ...cell, textAlign: "right", fontWeight: 700 }}>{n3(totalQ)}</td>
            <td style={cell}></td>
            <td style={{ ...cell, textAlign: "right", fontWeight: 700 }}>{n2(totalV)}</td>
          </tr>
        </tbody>
      </table>

      {data.originText && <div style={{ fontSize: 11, marginBottom: 6 }}>{data.originText}</div>}
      <div style={{ marginBottom: 6 }}>{data.vatText ?? ""} · VAT {n2(data.vatRate ?? 0)} %</div>
      <div style={{ marginBottom: 6 }}>Payment conditions: {data.paymentConditions ?? ""}</div>
      {data.notes && <div style={{ fontSize: 11, marginBottom: 6 }}>{data.notes}</div>}
      {/* Date / City / Manager блок */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginTop: 14, marginBottom: 4 }}>
        <div>Date: <b>{d(data.date ?? data.invoiceDate)}</b></div>
        <div>City: <b>{data.city ?? ""}</b></div>
        <div>Manager: <b>{data.manager ?? ""}</b></div>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 18 }}>
        <div>{data.originPlace ?? ""}</div>
        <div style={{ textAlign: "center" }}>Seller: ______________<br /><span style={{ fontSize: 10.5 }}>/ Sign. &amp; Stamp /</span></div>
      </div>
    </div>
  );
}
