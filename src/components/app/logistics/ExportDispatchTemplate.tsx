"use client";
import { dispatchTotalQuantity } from "@/lib/logistics/exportDocs";

type Party = { name?: string | null; address?: string | null; city?: string | null; vatNumber?: string | null; registrationNumber?: string | null };
type Row = { lineNo?: number; truck?: string | null; material?: string | null; unit?: string | null; quantity?: number | null; valueMkd?: string | null };
export type DispatchDocData = {
  dispatchNumber?: string | null; date?: string | null; issuer?: Party; recipient?: Party | null;
  destination?: string | null; rows?: Row[]; totalQuantity?: number | null; blank?: boolean;
};

// Документът е на македонски/административен формат. Датата и количествата следват
// локалната нотация; количеството е винаги с 3 знака (само визуализация, snapshot-ът е реален).
const d = (s?: string | null) => s ? new Date(s).toLocaleDateString("mk-MK") : "";
const yearOf = (s?: string | null) => s ? String(new Date(s).getFullYear()) : "";
const nf3 = new Intl.NumberFormat("bg-BG", { minimumFractionDigits: 3, maximumFractionDigits: 3 });
const n3 = (v?: number | null) => v == null ? "" : nf3.format(v);

// Точни пропорции на колоните по оригиналния Excel шаблон (widths A..L).
const COL = { no: "7%", truck: "19%", material: "36%", unit: "10%", qty: "9%", value: "19%" };
const MIN_ROWS = 6; // първи активен ред + празни редове за ръчно дописване (§7)

/**
 * „Испратница" — рендира ЕДНО копие 1:1 по оригиналния фирмен шаблон (Сем Интернационал).
 * Черен текст/бял фон/черни линии, без CDA брандинг. Данните идват от snapshot-а на
 * документа (issuer/recipient/rows/…); текстовете тук са само форма/оформление.
 */
export function ExportDispatchTemplate({ data, blank = false }: { data: DispatchDocData; blank?: boolean }) {
  const rows = data.rows ?? [];
  const totalQ = data.totalQuantity ?? dispatchTotalQuantity(rows);
  const bodyRows: (Row | null)[] = [...rows];
  while (bodyRows.length < MIN_ROWS) bodyRows.push(null);

  const B = "1px solid #000";
  const cell: React.CSSProperties = { border: B, padding: "2px 5px", fontSize: 11.5, verticalAlign: "middle", height: 22 };
  const dots = (n = 90) => "." .repeat(n);
  const recipientText = blank ? "" : [data.recipient?.name, data.recipient?.address, data.recipient?.city].filter(Boolean).join(", ");

  return (
    <div className="printable dispatch-copy" style={{ fontFamily: "'Times New Roman', Times, serif", color: "#000", background: "#fff", width: "100%", boxSizing: "border-box", padding: "4mm 6mm", fontSize: 12, lineHeight: 1.25 }}>
      {/* Фирмен хедър — горе вляво (§2) */}
      <div style={{ fontWeight: 700 }}>{data.issuer?.name ?? ""}</div>
      <div>{data.issuer?.address ?? ""}</div>
      <div>{data.issuer?.city ?? ""}</div>

      {/* Заглавие центрирано + номер вдясно (§3) */}
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", gap: 6, margin: "8px 0 6px" }}>
        <span style={{ fontWeight: 700, fontSize: 14 }}>ИСПРАТНИЦА бр.</span>
        <span style={{ fontWeight: 700, fontSize: 14, minWidth: 36, textAlign: "center" }}>{data.dispatchNumber ?? ""}</span>
        {yearOf(data.date) && <><span style={{ fontSize: 14 }}>/</span><span style={{ fontSize: 14 }}>{yearOf(data.date)}</span></>}
      </div>

      {/* До: (получател, autofilled + пунктир) (§4) */}
      <div style={{ display: "flex", alignItems: "baseline", whiteSpace: "nowrap", overflow: "hidden", marginBottom: 2 }}>
        <span>До :&nbsp;</span>
        <span style={{ fontWeight: 600 }}>{recipientText}</span>
        <span style={{ flex: 1, letterSpacing: 1, overflow: "hidden" }}>&nbsp;{dots(140)}</span>
      </div>

      {/* Денес: (дата + пунктир) (§5) */}
      <div style={{ display: "flex", alignItems: "baseline", whiteSpace: "nowrap", overflow: "hidden", marginBottom: 6 }}>
        <span>Денес&nbsp;</span>
        <span style={{ fontWeight: 600 }}>{d(data.date)}</span>
        <span style={{ flex: 1, letterSpacing: 1, overflow: "hidden" }}>&nbsp;{dots(120)}</span>
      </div>

      {/* Основна таблица (§6) */}
      <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
        <colgroup>
          <col style={{ width: COL.no }} /><col style={{ width: COL.truck }} /><col style={{ width: COL.material }} />
          <col style={{ width: COL.unit }} /><col style={{ width: COL.qty }} /><col style={{ width: COL.value }} />
        </colgroup>
        <thead>
          <tr>
            <th style={{ ...cell, textAlign: "center", fontWeight: 700 }}>Ред бр.</th>
            <th style={{ ...cell, textAlign: "center", fontWeight: 700, lineHeight: 1.05 }}>Камион<br />рег. бр</th>
            <th style={{ ...cell, textAlign: "center", fontWeight: 700 }}>НАЗИВ НА МАТЕРИЈАЛИТЕ</th>
            <th style={{ ...cell, textAlign: "center", fontWeight: 700 }}>Мера</th>
            <th style={{ ...cell, textAlign: "center", fontWeight: 700 }}>Количина</th>
            <th style={{ ...cell, textAlign: "center", fontWeight: 700 }}>ИЗНОС ДЕНАРИ</th>
          </tr>
        </thead>
        <tbody>
          {bodyRows.map((r, i) => (
            <tr key={i}>
              <td style={{ ...cell, textAlign: "center" }}>{r ? (r.lineNo ?? i + 1) : ""}</td>
              <td style={{ ...cell, textAlign: "center" }}>{r?.truck ?? ""}</td>
              <td style={{ ...cell, textAlign: "left" }}>{r?.material ?? ""}</td>
              <td style={{ ...cell, textAlign: "center" }}>{r?.unit ?? ""}</td>
              <td style={{ ...cell, textAlign: "right" }}>{r && r.quantity != null ? n3(r.quantity) : ""}</td>
              <td style={{ ...cell, textAlign: "right" }}>{r?.valueMkd ?? ""}</td>
            </tr>
          ))}
          {/* ВКУПНО (§8): етикет вдясно на реда, количество + „по фактура" */}
          <tr>
            <td style={{ ...cell, border: "none" }} colSpan={2}></td>
            <td style={{ ...cell, textAlign: "right", fontWeight: 700 }}>ВКУПНО :</td>
            <td style={cell}></td>
            <td style={{ ...cell, textAlign: "right", fontWeight: 700 }}>{n3(totalQ)}</td>
            <td style={{ ...cell, textAlign: "right" }}>по фактура</td>
          </tr>
        </tbody>
      </table>

      {/* Истоварено (§9) — вдясно, попълва се ръчно */}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 18, marginTop: 8, fontSize: 11.5 }}>
        <span>Истоварено:</span>
        <span>Дата {dots(18)}</span>
        <span>Час {dots(10)}</span>
      </div>

      {/* Подписи (§10) */}
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 14 }}>
        <div style={{ width: "45%", textAlign: "center" }}>
          <div style={{ textAlign: "left" }}>ИЗДАЛ :</div>
          <div style={{ marginTop: 14, borderTop: "1px solid #000" }} />
        </div>
        <div style={{ width: "45%", textAlign: "center" }}>
          <div style={{ textAlign: "left" }}>ПРИМИЛ :</div>
          <div style={{ marginTop: 14, borderTop: "1px solid #000" }} />
          <div style={{ fontSize: 10.5 }}>/ име, презиме, печат /</div>
        </div>
      </div>
    </div>
  );
}
