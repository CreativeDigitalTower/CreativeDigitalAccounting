"use client";
import { resolveInvoiceParty } from "@/lib/logistics/invoiceParties";
import { formatCertificateLine } from "@/lib/logistics/exportDocs";

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

const d = (s?: string | null) => s ? new Date(s).toLocaleDateString("en-CA") : ""; // YYYY-MM-DD (долен place/date)
const dmy = (s?: string | null) => s ? new Date(s).toLocaleDateString("en-GB") : ""; // DD/MM/YYYY (фактура §4)
// Количество/тегло — 3 знака, BG десетичен разделител (26.040 t → „26,040"; kg → „26,040 kg.").
const nf3 = new Intl.NumberFormat("bg-BG", { minimumFractionDigits: 3, maximumFractionDigits: 3 });
const q3 = (v?: number | null) => v == null ? "" : nf3.format(v);

// Град + държава без дублиране (§2/§14): ако градът вече съдържа държавата, не я добавяме пак.
function cityCountry(city?: string | null, country?: string | null): string {
  const ci = (city ?? "").trim(); const co = (country ?? "").trim();
  if (!co) return ci; if (!ci) return co;
  const n = (s: string) => s.toLowerCase().replace(/[.,]/g, "").trim();
  return n(ci).includes(n(co)) ? ci : `${ci}, ${co}`;
}
// Транслитерация кирилица→латиница за дестинацията (напр. „Скопие" → „SKOPIE").
const CYR2LAT: Record<string, string> = { а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ж: "z", з: "z", и: "i", й: "i", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "c", ч: "c", ш: "s", щ: "s", ъ: "a", ю: "u", я: "a", ј: "j", ѓ: "g", ќ: "k", љ: "lj", њ: "nj", џ: "d" };
function translitLat(s: string): string {
  return s.split("").map((ch) => CYR2LAT[ch.toLowerCase()] ? (ch === ch.toUpperCase() ? CYR2LAT[ch.toLowerCase()].toUpperCase() : CYR2LAT[ch.toLowerCase()]) : ch).join("");
}
// „Чиста" дестинация за CMR: без „FCA …"/route шум → само града, латиница (§2). Default SKOPIE.
function cleanDestination(dst?: string | null): string {
  const first = (dst ?? "").split("/")[0].replace(/\bFCA\b/gi, "").trim();
  return translitLat(first || "SKOPIE").toUpperCase();
}
// Продуктово описание: гарантира „Holcim" след „CEMENT" (§7/§13), ако липсва. Editable.
function productDescription(desc?: string | null): string {
  const t = (desc ?? "").trim();
  if (!t) return "CEMENT Holcim CEM II/A-LL 42,5 R - IN BULK";
  if (/holcim/i.test(t)) return t;
  return t.replace(/^CEMENT\s+/i, "CEMENT Holcim ");
}

// CMR Epson presentation defaults (editable override на document ниво, §17). Company-scoped.
// Сертификатът вече идва динамично от продукта/snapshot-а (§2/§8) — БЕЗ hardcoded default.
const CMR_DEFAULTS = { speditor: "ENIGMA", destinationCountry: "NORTH MACEDONIA", customsCode: "25232900" };

/**
 * Нормализира CMR Epson данните в canonical renderer-а (§14/§15/§16): прилага
 * правилните фирмени имена, дедупликация на държава, дестинация SKOPIE и default-ите
 * за спедитор/митн. код/сертификат — така СТАРИ snapshot-и също се рендират коректно,
 * а preview = PDF = print. НЕ променя master данните.
 */
function normalizeCmr(data: CmrDocData): CmrDocData {
  const sender = resolveInvoiceParty(data.sender ?? {});
  const consignee = resolveInvoiceParty(data.consignee ?? {});
  const g = data.goods ?? {};
  return {
    ...data,
    sender, consignee,
    destination: cleanDestination(data.destination),
    destinationCountry: data.destinationCountry?.trim() || CMR_DEFAULTS.destinationCountry,
    speditor: data.speditor?.trim() || CMR_DEFAULTS.speditor,
    goods: {
      description: productDescription(g.description),
      customsCode: (g.customsCode ?? "").trim() || CMR_DEFAULTS.customsCode,
      certificate: (g.certificate ?? "").trim() || null, // §9 — липсва → без ред
    },
  };
}

// ── CMR PRINT OVERLAY (Epson и HP) върху предпечатана физическа бланка (§0,§3,§4).
// Само динамичните данни на абсолютни mm координати, ИЗМЕРЕНИ от оригиналните Excel
// файлове. Epson и HP са РАЗЛИЧНИ физически бланки → отделни координатни карти (§21),
// но споделят един renderer, данни, нормализация и формати. ──
type Field = { x: number; y: number; text: string; bold?: boolean };
type XY = [number, number];
type CmrCoords = Record<
  "senderName" | "senderAddr" | "senderCity" | "consName" | "consAddr" | "consCity"
  | "dest" | "destCountry" | "speditor" | "place" | "loadDate"
  | "invLabel" | "invNo" | "invRef" | "product" | "customs" | "qty" | "cert"
  | "netWeight" | "total" | "truckTop" | "truckBottom" | "placeBottom" | "dateBottom", XY>;

// Координати за CMR EPSON (от „CMR Epson_____р.xlsx", print area B1:K, margins L9/T8mm).
const EPSON_COORDS: CmrCoords = {
  senderName: [18, 30.5], senderAddr: [18, 35.3], senderCity: [18, 40.0],
  consName: [18, 58.8], consAddr: [18, 63.3], consCity: [18, 67.8],
  dest: [36.3, 81.1], destCountry: [36.3, 85.6], speditor: [114.2, 81.1],
  place: [36.3, 98.5], loadDate: [36.3, 103.0],
  invLabel: [13.1, 114.4], invNo: [38, 114.4], invRef: [62, 114.4],
  product: [19, 136.4], customs: [127.6, 136.4], qty: [148.4, 136.4], cert: [24, 141.4],
  netWeight: [22, 152.5], total: [121, 167.6],
  truckTop: [118.6, 108.5], truckBottom: [76.3, 281.3], placeBottom: [13.1, 261.3], dateBottom: [76.3, 261.3],
};
// Координати за CMR HP (от „SK501____.xlsx", sheet „CMR_HP"). Различна геометрия от Epson (§21).
const HP_COORDS: CmrCoords = {
  senderName: [18.3, 29.4], senderAddr: [18.3, 33.9], senderCity: [18.3, 38.7],
  consName: [18.3, 54.8], consAddr: [18.3, 59.3], consCity: [18.3, 63.8],
  dest: [41.6, 76.5], destCountry: [41.6, 81.0], speditor: [116.7, 76.5],
  place: [41.6, 93.5], loadDate: [41.6, 97.7],
  invLabel: [18.3, 110.4], invNo: [41.6, 110.4], invRef: [63, 110.4],
  product: [18.3, 132.4], customs: [124.8, 132.4], qty: [145.6, 132.4], cert: [24, 137.4],
  netWeight: [18.3, 148.5], total: [116.7, 163.6],
  truckTop: [124.8, 97.7], truckBottom: [81.3, 265.5], placeBottom: [41.6, 246.7], dateBottom: [81.3, 246.7],
};

function buildCmrFields(raw: CmrDocData, k: CmrCoords): Field[] {
  const data = normalizeCmr(raw);
  const s = data.sender ?? {}; const c = data.consignee ?? {};
  const speditor = data.speditor ? `SPEDITOR :  ${data.speditor}` : "";
  const qty = q3(data.quantity);
  const truck = raw.truck ?? "";
  const F = (xy: XY, text: string, bold = false): Field => ({ x: xy[0], y: xy[1], text, bold });
  return [
    F(k.senderName, s.name ?? "", true), F(k.senderAddr, s.address ?? ""), F(k.senderCity, cityCountry(s.city, s.country).toUpperCase()),
    F(k.consName, c.name ?? "", true), F(k.consAddr, c.address ?? ""), F(k.consCity, cityCountry(c.city, c.country).toUpperCase()),
    F(k.dest, (data.destination ?? "").toUpperCase()), F(k.destCountry, data.destinationCountry ?? ""),
    F(k.speditor, speditor), F(k.place, data.placeOfShipment ?? ""), F(k.loadDate, d(data.date)),
    F(k.invLabel, "INVOICE No"), F(k.invNo, data.invoiceNumber ?? "", true), F(k.invRef, dmy(data.invoiceDate) ? `/ ${dmy(data.invoiceDate)}` : "/"),
    F(k.product, data.goods?.description ?? "", true), F(k.customs, data.goods?.customsCode ?? ""), F(k.qty, qty),
    F(k.cert, formatCertificateLine(data.goods?.certificate) ?? ""),
    F(k.netWeight, `NET  WEIGHT:  ${qty} kg.`, true), F(k.total, `TOTAL:  ${qty} kg.`, true),
    F(k.truckTop, truck, true), F(k.truckBottom, truck),
    F(k.placeBottom, data.placeBottom ?? ""), F(k.dateBottom, d(data.date)),
  ];
}

function CmrOverlay({ data, coords, sheetClass }: { data: CmrDocData; coords: CmrCoords; sheetClass: string }) {
  const fields = buildCmrFields(data, coords);
  const ox = data.calibX ?? 0; const oy = data.calibY ?? 0;
  return (
    <div className={`printable ${sheetClass}`} style={{ position: "relative", width: "210mm", height: "297mm", background: "#fff", boxSizing: "border-box", overflow: "hidden", fontFamily: "Arial, sans-serif", color: "#000" }}>
      {/* Референтна мрежа само в preview (никога при print, §16) */}
      {data.preview && <div className="cmr-ref no-print" style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(#e6e6e6 1px, transparent 1px), linear-gradient(90deg, #e6e6e6 1px, transparent 1px)", backgroundSize: "10mm 10mm", opacity: 0.5 }} />}
      <div className="cmr-overlay" style={{ position: "absolute", inset: 0, transform: `translate(${ox}mm, ${oy}mm)` }}>
        {fields.map((f, i) => f.text ? (
          <div key={i} style={{ position: "absolute", left: `${f.x}mm`, top: `${f.y}mm`, fontSize: 11, fontWeight: f.bold ? 700 : 400, whiteSpace: "nowrap", lineHeight: 1 }}>{f.text}</div>
        ) : null)}
      </div>
    </div>
  );
}

export function ExportCmrTemplate({ data }: { data: CmrDocData }) {
  return data.layout === "hp"
    ? <CmrOverlay data={data} coords={HP_COORDS} sheetClass="cmr-hp-sheet" />
    : <CmrOverlay data={data} coords={EPSON_COORDS} sheetClass="cmr-epson-sheet" />;
}
