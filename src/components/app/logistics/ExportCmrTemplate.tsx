"use client";
import { companyIdentifier } from "@/lib/company/identifier";
import { cmrPrintOffset } from "@/lib/logistics/exportDocs";

type Party = { name?: string | null; address?: string | null; city?: string | null; country?: string | null; eik?: string | null; registrationNumber?: string | null; vatNumber?: string | null };
export type CmrDocData = {
  layout?: "epson" | "hp" | null;
  sender?: Party; consignee?: Party;
  destination?: string | null; destinationCountry?: string | null;
  placeOfShipment?: string | null; placeBottom?: string | null;
  date?: string | null; invoiceDate?: string | null;
  truck?: string | null; invoiceNumber?: string | null;
  goods?: { description?: string | null; customsCode?: string | null; certificate?: string | null } | null;
  quantity?: number | null; weightKg?: number | null; speditor?: string | null; carrier?: string | null;
  /** Калибриране на печатния overlay (mm), спрямо предпечатаната бланка. */
  calibX?: number | null; calibY?: number | null;
  /** Показва референтна мрежа/рамка в preview (никога при print). */
  preview?: boolean;
};

const d = (s?: string | null) => s ? new Date(s).toLocaleDateString("en-CA") : ""; // YYYY-MM-DD както в оригинала
const yearOf = (s?: string | null) => s ? String(new Date(s).getFullYear()) : "";
// Количество/тегло — 3 знака, BG десетичен разделител (26.040 t → „26,040"; kg → „26,040 kg.").
const nf3 = new Intl.NumberFormat("bg-BG", { minimumFractionDigits: 3, maximumFractionDigits: 3 });
const q3 = (v?: number | null) => v == null ? "" : nf3.format(v);

// ── HP layout: непроменен (стар рендер), не е предмет на тази задача (§1,§23). ──
function partyText(p?: Party) {
  if (!p) return "";
  const id = companyIdentifier(p);
  return [p.name, p.address, [p.city, p.country].filter(Boolean).join(", "), id ? `${id.kind === "eik" ? "ЕИК" : "Reg.No"} ${id.value}` : ""].filter(Boolean).join("\n");
}
function CmrHpTemplate({ data }: { data: CmrDocData }) {
  const off = cmrPrintOffset("hp");
  const box: React.CSSProperties = { border: "1px solid #000", padding: "5px 7px", fontSize: 11.5, whiteSpace: "pre-line", minHeight: 46 };
  const num = (n: number) => <span style={{ fontSize: 9.5, fontWeight: 700, color: "#333", marginRight: 4 }}>{n}</span>;
  const dd = (s?: string | null) => s ? new Date(s).toLocaleDateString("bg-BG") : "";
  const kg = (v?: number | null) => v == null ? "" : v.toLocaleString("bg-BG", { minimumFractionDigits: 0, maximumFractionDigits: 3 });
  return (
    <div className="printable" data-cmr-layout="hp"
      style={{ fontFamily: "Arial, sans-serif", color: "#000", background: "#fff", width: 720, margin: "0 auto", padding: 20, paddingTop: 20 + off.top, paddingLeft: 20 + off.left, fontSize: 11.5, lineHeight: 1.4 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
        <div style={{ fontWeight: 700, fontSize: 14 }}>CMR — Международна товарителница</div><div style={{ fontSize: 10, color: "#555" }}>Layout: HP</div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0, border: "1px solid #000" }}>
        <div style={{ ...box, borderRight: "1px solid #000" }}>{num(1)}Изпращач / Sender{"\n"}{partyText(data.sender)}</div>
        <div style={box}>{num(2)}Получател / Consignee{"\n"}{partyText(data.consignee)}</div>
        <div style={{ ...box, borderRight: "1px solid #000", borderTop: "1px solid #000" }}>{num(3)}Място на доставяне{"\n"}{data.destination ?? ""}</div>
        <div style={{ ...box, borderTop: "1px solid #000" }}>{num(4)}Място и дата на натоварване{"\n"}{[data.placeOfShipment, dd(data.date)].filter(Boolean).join(" · ")}</div>
        <div style={{ ...box, borderRight: "1px solid #000", borderTop: "1px solid #000" }}>{num(5)}Приложени документи{"\n"}Фактура № {data.invoiceNumber ?? ""}</div>
        <div style={{ ...box, borderTop: "1px solid #000" }}>{num(16)}Превозвач / Carrier{"\n"}{data.carrier ?? data.speditor ?? ""}</div>
      </div>
      <div style={{ border: "1px solid #000", borderTop: 0 }}>
        <div style={{ ...box, borderBottom: "1px solid #000" }}>{num(6)}Описание на стоката{"\n"}{data.goods?.description ?? "CEMENT"}{data.goods?.customsCode ? `   ·   Митн. код: ${data.goods.customsCode}` : ""}</div>
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

// ── CMR EPSON: PRINT OVERLAY върху предпечатана бланка (§3,§4). Само динамичните
// данни на абсолютни mm координати, измерени от оригиналния Excel (print area B1:K~53,
// portrait, margins L9/T8mm). Никакви рамки/labels на CMR формуляра при печат. ──
type Field = { x: number; y: number; text: string; w?: number; size?: number; bold?: boolean; pre?: boolean };

function CmrEpsonOverlay({ data }: { data: CmrDocData }) {
  const s = data.sender ?? {}; const c = data.consignee ?? {};
  const speditor = data.speditor ? `SPEDITOR :  ${data.speditor}` : "";
  const F: Field[] = [
    // Изпращач (координати B3/B4/B5 + вътрешен отстъп както в оригинала)
    { x: 18, y: 30.5, text: s.name ?? "", bold: true },
    { x: 18, y: 35.3, text: s.address ?? "" },
    { x: 18, y: 40.0, text: [s.city, s.country].filter(Boolean).join(", ").toUpperCase() },
    // Получател (B8/B9/B10)
    { x: 18, y: 58.8, text: c.name ?? "", bold: true },
    { x: 18, y: 63.3, text: c.address ?? "" },
    { x: 18, y: 67.8, text: [c.city, c.country].filter(Boolean).join(", ").toUpperCase() },
    // Дестинация (C13) + държава (C14)
    { x: 36.3, y: 81.1, text: (data.destination ?? "").toUpperCase() },
    { x: 36.3, y: 85.6, text: (data.destinationCountry ?? "") },
    // Спедитор (H13)
    { x: 114.2, y: 81.1, text: speditor },
    // Място/произход (C17)
    { x: 36.3, y: 98.5, text: data.placeOfShipment ?? "" },
    // Фактура (B20 + C20 + D20)
    { x: 13.1, y: 114.4, text: "INVOICE No" },
    { x: 40, y: 114.4, text: data.invoiceNumber ?? "", bold: true },
    { x: 92, y: 114.4, text: yearOf(data.invoiceDate) ? `/ ${yearOf(data.invoiceDate)}` : "/" },
    // Продукт (B25) + митн. код (I25) + количество (J25)
    { x: 19, y: 136.4, text: data.goods?.description ?? "", bold: true },
    { x: 127.6, y: 136.4, text: data.goods?.customsCode ?? "" },
    { x: 148.4, y: 136.4, text: q3(data.quantity) },
    // Сертификат (B26)
    { x: 24, y: 141.4, text: data.goods?.certificate ? `(Certificate No ${data.goods.certificate})` : "" },
    // NET WEIGHT (B28 + D28 + E28)
    { x: 22, y: 152.5, text: "NET  WEIGHT:" },
    { x: 58, y: 152.5, text: q3(data.quantity), bold: true },
    { x: 76.3, y: 152.5, text: "kg." },
    // TOTAL (H31 + J31 + K31)
    { x: 129, y: 167.6, text: "TOTAL:", bold: true },
    { x: 148.4, y: 167.6, text: q3(data.quantity), bold: true },
    { x: 168.5, y: 167.6, text: "kg." },
    // Камион / ремарке — на реда за рег. № (около H..K, y≈114 в бланката е горе; тук
    // го поставяме до фактурата вдясно, спрямо оригинала — I19 зоната)
    { x: 118.6, y: 108.5, text: data.truck ?? "", bold: true },
    // Долу: място (B49) + дата (E49)
    { x: 13.1, y: 261.3, text: data.placeBottom ?? "" },
    { x: 76.3, y: 261.3, text: d(data.date) },
  ];
  const ox = data.calibX ?? 0; const oy = data.calibY ?? 0;
  return (
    <div className="cmr-epson-sheet" style={{ position: "relative", width: "210mm", height: "297mm", background: "#fff", boxSizing: "border-box", overflow: "hidden" }}>
      {/* Референтна мрежа само в preview (никога при print, §16) */}
      {data.preview && <div className="cmr-ref no-print" style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(#e6e6e6 1px, transparent 1px), linear-gradient(90deg, #e6e6e6 1px, transparent 1px)", backgroundSize: "10mm 10mm", opacity: 0.5 }} />}
      <div className="cmr-overlay" style={{ position: "absolute", inset: 0, transform: `translate(${ox}mm, ${oy}mm)` }}>
        {F.map((f, i) => f.text ? (
          <div key={i} style={{ position: "absolute", left: `${f.x}mm`, top: `${f.y}mm`, width: f.w ? `${f.w}mm` : undefined, fontSize: f.size ?? 11, fontWeight: f.bold ? 700 : 400, whiteSpace: f.pre ? "pre" : "nowrap", lineHeight: 1 }}>{f.text}</div>
        ) : null)}
      </div>
    </div>
  );
}

export function ExportCmrTemplate({ data }: { data: CmrDocData }) {
  return data.layout === "hp" ? <CmrHpTemplate data={data} /> : <CmrEpsonOverlay data={data} />;
}
