"use client";
import { companyIdentifier } from "@/lib/company/identifier";
import { cmrPrintOffset } from "@/lib/logistics/exportDocs";

type Party = { name?: string | null; address?: string | null; city?: string | null; country?: string | null; eik?: string | null; registrationNumber?: string | null; vatNumber?: string | null };
export type CmrDocData = {
  layout?: "epson" | "hp" | null;
  sender?: Party; consignee?: Party;
  destination?: string | null; placeOfShipment?: string | null; date?: string | null;
  truck?: string | null; invoiceNumber?: string | null;
  goods?: { description?: string | null; customsCode?: string | null } | null;
  weightKg?: number | null; speditor?: string | null; carrier?: string | null;
};

const d =(s?: string | null) => s ? new Date(s).toLocaleDateString("bg-BG") : "";
const kg = (v?: number | null) => v == null ? "" : v.toLocaleString("bg-BG", { minimumFractionDigits: 0, maximumFractionDigits: 3 });
function party(p?: Party) {
  if (!p) return "";
  const id = companyIdentifier(p);
  return [p.name, p.address, [p.city, p.country].filter(Boolean).join(", "), id ? `${id.kind === "eik" ? "ЕИК" : "Reg.No"} ${id.value}` : ""].filter(Boolean).join("\n");
}

export function ExportCmrTemplate({ data }: { data: CmrDocData }) {
  const layout = data.layout === "hp" ? "hp" : "epson";
  const off = cmrPrintOffset(layout);
  const box: React.CSSProperties = { border: "1px solid #000", padding: "5px 7px", fontSize: 11.5, whiteSpace: "pre-line", minHeight: 46 };
  const num = (n: number) => <span style={{ fontSize: 9.5, fontWeight: 700, color: "#333", marginRight: 4 }}>{n}</span>;

  return (
    <div className="printable" data-cmr-layout={layout}
      style={{ fontFamily: "Arial, sans-serif", color: "#000", background: "#fff", width: 720, margin: "0 auto",
               padding: 20, paddingTop: 20 + off.top, paddingLeft: 20 + off.left, fontSize: 11.5, lineHeight: 1.4 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
        <div style={{ fontWeight: 700, fontSize: 14 }}>CMR — Международна товарителница</div>
        <div style={{ fontSize: 10, color: "#555" }}>Layout: {layout.toUpperCase()}</div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0, border: "1px solid #000" }}>
        <div style={{ ...box, borderRight: "1px solid #000" }}>{num(1)}Изпращач / Sender{"\n"}{party(data.sender)}</div>
        <div style={box}>{num(2)}Получател / Consignee{"\n"}{party(data.consignee)}</div>
        <div style={{ ...box, borderRight: "1px solid #000", borderTop: "1px solid #000" }}>{num(3)}Място на доставяне / Place of delivery{"\n"}{data.destination ?? ""}</div>
        <div style={{ ...box, borderTop: "1px solid #000" }}>{num(4)}Място и дата на натоварване{"\n"}{[data.placeOfShipment, d(data.date)].filter(Boolean).join(" · ")}</div>
        <div style={{ ...box, borderRight: "1px solid #000", borderTop: "1px solid #000" }}>{num(5)}Приложени документи{"\n"}Фактура № {data.invoiceNumber ?? ""}</div>
        <div style={{ ...box, borderTop: "1px solid #000" }}>{num(16)}Превозвач / Carrier{"\n"}{data.carrier ?? data.speditor ?? ""}</div>
      </div>

      <div style={{ border: "1px solid #000", borderTop: 0 }}>
        <div style={{ ...box, borderBottom: "1px solid #000" }}>{num(6)}Марки и номера / Описание на стоката{"\n"}{data.goods?.description ?? "CEMENT"}{data.goods?.customsCode ? `   ·   Митн. код: ${data.goods.customsCode}` : ""}</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
          <div style={{ ...box, borderRight: "1px solid #000" }}>{num(9)}Рег. № на превозното средство{"\n"}{data.truck ?? ""}</div>
          <div style={box}>{num(11)}Бруто тегло, kg{"\n"}<span style={{ fontSize: 14, fontWeight: 700 }}>{kg(data.weightKg)}</span></div>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 22 }}>
        <div style={{ textAlign: "center" }}>{num(22)}Подпис на изпращача<br />______________</div>
        <div style={{ textAlign: "center" }}>{num(23)}Подпис на превозвача<br />______________</div>
        <div style={{ textAlign: "center" }}>{num(24)}Стоката получена<br />______________</div>
      </div>
    </div>
  );
}
