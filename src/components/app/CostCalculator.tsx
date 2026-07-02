"use client";

import { useState } from "react";

type Row = { name: string; used: string; purchased: string; price: string };
const emptyRow: Row = { name: "", used: "", purchased: "", price: "" };

export function CostCalculator() {
  const [open, setOpen] = useState(false);
  const [product, setProduct] = useState("");
  const [output, setOutput] = useState("1");
  const [rows, setRows] = useState<Row[]>([{ ...emptyRow }]);

  const rowCost = (r: Row) => {
    const used = parseFloat(r.used) || 0;
    const purchased = parseFloat(r.purchased) || 0;
    const price = parseFloat(r.price) || 0;
    if (purchased <= 0) return 0;
    return (price / purchased) * used;
  };
  const totalCost = rows.reduce((s, r) => s + rowCost(r), 0);
  const units = parseFloat(output) || 0;
  const perUnit = units > 0 ? totalCost / units : 0;

  const update = (i: number, k: keyof Row, v: string) => setRows(rows.map((r, idx) => idx === i ? { ...r, [k]: v } : r));

  return (
    <div className="glass panel" style={{ padding: "18px 22px", marginTop: 18 }}>
      <button onClick={() => setOpen(!open)} style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "'Fraunces', serif", fontSize: 16, fontWeight: 700 }}>
        {open ? "▼" : "▶"} Калкулатор за себестойност на продукт
      </button>
      {open && (
        <div style={{ marginTop: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12, marginBottom: 14 }}>
            <div><label>Име на продукта</label><input value={product} onChange={(e) => setProduct(e.target.value)} placeholder="напр. Торта Ритц" /></div>
            <div><label>Брой произведени бройки</label><input type="number" step="any" min="1" value={output} onChange={(e) => setOutput(e.target.value)} /></div>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table>
              <thead>
                <tr>
                  <th>Съставка</th>
                  <th className="num">Използвано к-во</th>
                  <th className="num">Закупено к-во</th>
                  <th className="num">Цена на закупеното (€)</th>
                  <th className="num">Себестойност (€)</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i}>
                    <td><input value={r.name} onChange={(e) => update(i, "name", e.target.value)} placeholder="напр. Брашно" style={{ padding: "6px 8px", fontSize: 13 }} /></td>
                    <td><input type="number" step="any" value={r.used} onChange={(e) => update(i, "used", e.target.value)} style={{ padding: "6px 8px", fontSize: 13, textAlign: "right", maxWidth: 110 }} /></td>
                    <td><input type="number" step="any" value={r.purchased} onChange={(e) => update(i, "purchased", e.target.value)} style={{ padding: "6px 8px", fontSize: 13, textAlign: "right", maxWidth: 110 }} /></td>
                    <td><input type="number" step="any" value={r.price} onChange={(e) => update(i, "price", e.target.value)} style={{ padding: "6px 8px", fontSize: 13, textAlign: "right", maxWidth: 120 }} /></td>
                    <td className="num" style={{ fontWeight: 600 }}>{rowCost(r).toFixed(2)}</td>
                    <td>{rows.length > 1 && <button onClick={() => setRows(rows.filter((_, idx) => idx !== i))} style={{ background: "none", border: "none", color: "var(--brick)", cursor: "pointer", fontSize: 16 }}>×</button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button onClick={() => setRows([...rows, { ...emptyRow }])} style={{ marginTop: 8, fontSize: 12.5, fontWeight: 600, color: "var(--navy)", background: "none", border: "1px dashed var(--border)", padding: "7px 12px", borderRadius: 6, cursor: "pointer" }}>+ Добави съставка</button>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 16 }}>
            <div style={{ textAlign: "center", padding: 16, background: "var(--navy-soft)", borderRadius: 12 }}>
              <div style={{ fontSize: 12, color: "var(--ink-soft)" }}>Обща себестойност (партида)</div>
              <div className="num" style={{ fontSize: 22, fontWeight: 700, color: "var(--navy)" }}>{totalCost.toFixed(2)} €</div>
            </div>
            <div style={{ textAlign: "center", padding: 16, background: "var(--emerald-soft)", borderRadius: 12 }}>
              <div style={{ fontSize: 12, color: "var(--ink-soft)" }}>Себестойност за 1 бройка</div>
              <div className="num" style={{ fontSize: 22, fontWeight: 700, color: "var(--emerald-dark)" }}>{perUnit.toFixed(2)} €</div>
            </div>
          </div>

          <p style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 12, lineHeight: 1.5 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{verticalAlign:"-2px"}}><path d="M12 3 1.5 21h21L12 3Z"/><path d="M12 10v5M12 18h.01"/></svg> Калкулацията включва само вложените суровини. В нея <strong>не влизат</strong> консумативи и допълнителни разходи —
            вода, ток, отопление, наем, заплати на служители, опаковки, амортизация и др. За пълна себестойност добавете и тези разходи отделно.
          </p>
        </div>
      )}
    </div>
  );
}
