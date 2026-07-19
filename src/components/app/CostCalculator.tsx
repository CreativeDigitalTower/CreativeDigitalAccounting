"use client";
import { NumberField } from "@/components/i18n/NumberField";

import { useState } from "react";
import { useT } from "@/components/i18n/I18nProvider";

type Row = { name: string; used: string; purchased: string; price: string };
const emptyRow: Row = { name: "", used: "", purchased: "", price: "" };

export function CostCalculator() {
  const t = useT();
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
        {open ? "▼" : "▶"} {t("production.cost.toggle")}
      </button>
      {open && (
        <div style={{ marginTop: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12, marginBottom: 14 }}>
            <div><label>{t("production.cost.productName")}</label><input value={product} onChange={(e) => setProduct(e.target.value)} placeholder={t("production.cost.productNamePh")} /></div>
            <div><label>{t("production.cost.outputCount")}</label><NumberField value={output} decimals={3} onChange={setOutput} /></div>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table>
              <thead>
                <tr>
                  <th>{t("production.cost.thIngredient")}</th>
                  <th className="num">{t("production.cost.thUsed")}</th>
                  <th className="num">{t("production.cost.thPurchased")}</th>
                  <th className="num">{t("production.cost.thPrice")}</th>
                  <th className="num">{t("production.cost.thCost")}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i}>
                    <td><input value={r.name} onChange={(e) => update(i, "name", e.target.value)} placeholder={t("production.cost.ingredientPh")} style={{ padding: "6px 8px", fontSize: 13 }} /></td>
                    <td><NumberField value={r.used} decimals={3} onChange={(v) => update(i, "used", v)} style={{ padding: "6px 8px", fontSize: 13, textAlign: "right", maxWidth: 110 }} /></td>
                    <td><NumberField value={r.purchased} decimals={3} onChange={(v) => update(i, "purchased", v)} style={{ padding: "6px 8px", fontSize: 13, textAlign: "right", maxWidth: 110 }} /></td>
                    <td><NumberField value={r.price} decimals={3} onChange={(v) => update(i, "price", v)} style={{ padding: "6px 8px", fontSize: 13, textAlign: "right", maxWidth: 120 }} /></td>
                    <td className="num" style={{ fontWeight: 600 }}>{rowCost(r).toFixed(2)}</td>
                    <td>{rows.length > 1 && <button onClick={() => setRows(rows.filter((_, idx) => idx !== i))} style={{ background: "none", border: "none", color: "var(--brick)", cursor: "pointer", fontSize: 16 }}>×</button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button onClick={() => setRows([...rows, { ...emptyRow }])} style={{ marginTop: 8, fontSize: 12.5, fontWeight: 600, color: "var(--navy)", background: "none", border: "1px dashed var(--border)", padding: "7px 12px", borderRadius: 6, cursor: "pointer" }}>{t("production.cost.addIngredient")}</button>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 16 }}>
            <div style={{ textAlign: "center", padding: 16, background: "var(--navy-soft)", borderRadius: 12 }}>
              <div style={{ fontSize: 12, color: "var(--ink-soft)" }}>{t("production.cost.totalLabel")}</div>
              <div className="num" style={{ fontSize: 22, fontWeight: 700, color: "var(--navy)" }}>{totalCost.toFixed(2)} €</div>
            </div>
            <div style={{ textAlign: "center", padding: 16, background: "var(--emerald-soft)", borderRadius: 12 }}>
              <div style={{ fontSize: 12, color: "var(--ink-soft)" }}>{t("production.cost.perUnitLabel")}</div>
              <div className="num" style={{ fontSize: 22, fontWeight: 700, color: "var(--emerald-dark)" }}>{perUnit.toFixed(2)} €</div>
            </div>
          </div>

          <p style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 12, lineHeight: 1.5 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{verticalAlign:"-2px"}}><path d="M12 3 1.5 21h21L12 3Z"/><path d="M12 10v5M12 18h.01"/></svg> {t("production.cost.notePre")}<strong>{t("production.cost.noteBold")}</strong>{t("production.cost.notePost")}
          </p>
        </div>
      )}
    </div>
  );
}
