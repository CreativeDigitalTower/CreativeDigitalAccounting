"use client";

import { useState } from "react";
import Link from "next/link";

// Ориентировъчни ставки (България). Служител: осигуровки общо ~13.78%, данък 10%.
// Работодател: осигуровки общо ~18.92% – 19.62% според категорията труд.
const EMPLOYEE_INS = 0.1378;
const EMPLOYER_INS = 0.1892;
const TAX = 0.10;
const MAX_INS_BASE = 4130; // максимален осигурителен доход (ориентировъчно)

export default function SalaryCalc() {
  const [gross, setGross] = useState("2000");

  const g = parseFloat(gross) || 0;
  const base = Math.min(g, MAX_INS_BASE);
  const empIns = base * EMPLOYEE_INS;
  const taxable = g - empIns;
  const tax = Math.max(0, taxable * TAX);
  const net = g - empIns - tax;
  const employerIns = base * EMPLOYER_INS;
  const totalCost = g + employerIns;

  const rows = [
    { l: "Бруто заплата", v: g, strong: false },
    { l: `Осигуровки (служител, ${(EMPLOYEE_INS * 100).toFixed(2)}%)`, v: -empIns, strong: false },
    { l: "Облагаема сума", v: taxable, strong: false },
    { l: "Данък общ доход (10%)", v: -tax, strong: false },
    { l: "Нето заплата (сума за получаване)", v: net, strong: true },
  ];

  return (
    <>
      <Link href="/tools" style={{ color: "var(--muted)", textDecoration: "none", fontSize: 13 }}>← Всички инструменти</Link>
      <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 26, fontWeight: 700, margin: "10px 0 20px" }}>Калкулатор за заплати</h1>

      <div className="glass panel" style={{ padding: 28 }}>
        <div style={{ maxWidth: 280 }}>
          <label>Бруто заплата (BGN/EUR)</label>
          <input type="number" value={gross} onChange={(e) => setGross(e.target.value)} />
        </div>
        <div style={{ marginTop: 22 }}>
          {rows.map((r) => (
            <div key={r.l} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid rgba(217,215,200,.6)", fontWeight: r.strong ? 700 : 400, fontSize: r.strong ? 16 : 13.5, color: r.strong ? "var(--emerald-dark)" : r.v < 0 ? "var(--brick)" : "var(--ink)" }}>
              <span>{r.l}</span><span className="num">{r.v.toFixed(2)}</span>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 18, padding: "14px 16px", background: "var(--navy-soft)", borderRadius: 10, fontSize: 13 }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}><span>Осигуровки за сметка на работодателя ({(EMPLOYER_INS * 100).toFixed(2)}%)</span><span className="num">{employerIns.toFixed(2)}</span></div>
          <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, marginTop: 6 }}><span>Общ разход за работодателя</span><span className="num">{totalCost.toFixed(2)}</span></div>
        </div>
        <p style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 14 }}>
          Стойностите са ориентировъчни и зависят от категорията труд, размера на осигурителния доход и конкретни обстоятелства. Не представляват счетоводен съвет.
        </p>
      </div>
    </>
  );
}
