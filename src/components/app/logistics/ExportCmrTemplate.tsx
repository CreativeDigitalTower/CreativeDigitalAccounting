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

const d = (s?: string | null) => s ? new Date(s).toLocaleDateString("en-CA") : ""; // YYYY-MM-DD (долен place/date блок)
const dmy = (s?: string | null) => s ? new Date(s).toLocaleDateString("en-GB") : ""; // DD/MM/YYYY (фактура)
// Град + държава без дублиране (§14): ако градът вече съдържа държавата, не я добавяме пак.
function cityCountry(city?: string | null, country?: string | null): string {
  const ci = (city ?? "").trim(); const co = (country ?? "").trim();
  if (!co) return ci; if (!ci) return co;
  const n = (s: string) => s.toLowerCase().replace(/[.,]/g, "").trim();
  return n(ci).includes(n(co)) ? ci : `${ci}, ${co}`;
}
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
  const qty = q3(data.quantity);
  const F: Field[] = [
    // Изпращач (B3/B4/B5)
    { x: 18, y: 30.5, text: s.name ?? "", bold: true },
    { x: 18, y: 35.3, text: s.address ?? "" },
    { x: 18, y: 40.0, text: cityCountry(s.city, s.country).toUpperCase() },
    // Получател (B8/B9/B10) — без дублирана държава (§14)
    { x: 18, y: 58.8, text: c.name ?? "", bold: true },
    { x: 18, y: 63.3, text: c.address ?? "" },
    { x: 18, y: 67.8, text: cityCountry(c.city, c.country).toUpperCase() },
    // Дестинация (C13) + държава (C14) — §2
    { x: 36.3, y: 81.1, text: (data.destination ?? "").toUpperCase() },
    { x: 36.3, y: 85.6, text: (data.destinationCountry ?? "") },
    // Спедитор (H13) — §3
    { x: 114.2, y: 81.1, text: speditor },
    // Място/произход (C17)
    { x: 36.3, y: 98.5, text: data.placeOfShipment ?? "" },
    // Дата на натоварване (C18)
    { x: 36.3, y: 103.0, text: d(data.date) },
    // Фактура (B20 + C20 + D20) — пълна дата, компактно (§4,§7)
    { x: 13.1, y: 114.4, text: "INVOICE No" },
    { x: 38, y: 114.4, text: data.invoiceNumber ?? "", bold: true },
    { x: 62, y: 114.4, text: dmy(data.invoiceDate) ? `/ ${dmy(data.invoiceDate)}` : "/" },
    // Продукт (B25) + митн. код (I25) + количество (J25)
    { x: 19, y: 136.4, text: data.goods?.description ?? "", bold: true },
    { x: 127.6, y: 136.4, text: data.goods?.customsCode ?? "" },
    { x: 148.4, y: 136.4, text: qty },
    // Сертификат (B26)
    { x: 24, y: 141.4, text: data.goods?.certificate ? `(Certificate No ${data.goods.certificate})` : "" },
    // NET WEIGHT — компактно като един блок (§8): „NET  WEIGHT:  26,000 kg."
    { x: 22, y: 152.5, text: `NET  WEIGHT:  ${qty} kg.`, bold: true },
    // TOTAL — компактно (§9): „TOTAL:  26,000 kg."
    { x: 121, y: 167.6, text: `TOTAL:  ${qty} kg.`, bold: true },
    // Камион / ремарке — ГОРНА позиция (I19, §10)
    { x: 118.6, y: 108.5, text: data.truck ?? "", bold: true },
    // Камион / ремарке — ВТОРА позиция (повторено в оригинала, §11) — долен блок E53
    { x: 76.3, y: 281.3, text: data.truck ?? "" },
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
