"use client";
import { dispatchTotalQuantity } from "@/lib/logistics/exportDocs";

type Party = { name?: string | null; address?: string | null; city?: string | null; vatNumber?: string | null; registrationNumber?: string | null };
type Row = { lineNo?: number; truck?: string | null; material?: string | null; unit?: string | null; quantity?: number | null; valueMkd?: string | null };
export type DispatchDocData = {
  dispatchNumber?: string | null; date?: string | null; issuer?: Party; recipient?: Party | null;
  destination?: string | null; rows?: Row[]; totalQuantity?: number | null; blank?: boolean;
};

const d = (s?: string | null) => s ? new Date(s).toLocaleDateString("bg-BG") : "";
const n3 = (v?: number | null) => v == null ? "" : v.toFixed(3);

export function ExportDispatchTemplate({ data, blank = false }: { data: DispatchDocData; blank?: boolean }) {
  const rows = data.rows ?? [];
  const totalQ = data.totalQuantity ?? dispatchTotalQuantity(rows);
  const cell: React.CSSProperties = { border: "1px solid #000", padding: "4px 6px", fontSize: 12 };
  return (
    <div className="printable" style={{ fontFamily: "Arial, sans-serif", color: "#000", background: "#fff", width: 720, margin: "0 auto", padding: 20, fontSize: 12.5, lineHeight: 1.5 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
        <div>
          <div style={{ fontWeight: 700 }}>{data.issuer?.name ?? ""}</div>
          <div>{data.issuer?.address}</div><div>{data.issuer?.city}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div>Испратница бр. <b>{data.dispatchNumber ?? ""}</b></div>
          <div>Датум: <b>{d(data.date)}</b></div>
        </div>
      </div>

      <div style={{ border: "1px solid #000", padding: "6px 8px", marginBottom: 8, minHeight: 44 }}>
        <div style={{ fontSize: 11, color: "#333" }}>До / Примач:</div>
        {blank ? <div style={{ height: 34 }} /> : (
          <>
            <div style={{ fontWeight: 700 }}>{data.recipient?.name ?? ""}</div>
            <div>{data.recipient?.address}</div><div>{data.recipient?.city}</div>
            {data.recipient?.vatNumber && <div>ЕДБ/VAT: {data.recipient.vatNumber}</div>}
          </>
        )}
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 8 }}>
        <thead><tr>
          <th style={cell}>Ред бр.</th><th style={cell}>Камион рег. бр.</th><th style={{ ...cell, textAlign: "left" }}>НАЗИВ НА МАТЕРИЈАЛИТЕ</th><th style={cell}>Мера</th><th style={cell}>Количина</th><th style={cell}>ИЗНОС ДЕНАРИ</th>
        </tr></thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              <td style={{ ...cell, textAlign: "center" }}>{r.lineNo ?? i + 1}</td>
              <td style={{ ...cell, textAlign: "center" }}>{r.truck}</td>
              <td style={{ ...cell, textAlign: "left" }}>{r.material}</td>
              <td style={{ ...cell, textAlign: "center" }}>{r.unit}</td>
              <td style={{ ...cell, textAlign: "right" }}>{n3(r.quantity)}</td>
              <td style={{ ...cell, textAlign: "right" }}>{r.valueMkd ?? ""}</td>
            </tr>
          ))}
          <tr>
            <td style={cell} colSpan={4}></td>
            <td style={{ ...cell, textAlign: "right", fontWeight: 700 }}>{n3(totalQ)}</td>
            <td style={cell}></td>
          </tr>
        </tbody>
      </table>

      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 24 }}>
        <div>Предал: ______________</div>
        <div>Примил: ______________</div>
      </div>
    </div>
  );
}
