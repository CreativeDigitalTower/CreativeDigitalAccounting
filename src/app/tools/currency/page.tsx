"use client";

import { useState } from "react";
import Link from "next/link";
import { EUR_TO_BGN } from "@/lib/constants";

// Ориентировъчни курсове спрямо EUR (BGN е фиксиран по закон)
const RATES: Record<string, number> = { EUR: 1, BGN: EUR_TO_BGN, USD: 1.08, GBP: 0.85, CHF: 0.94, RON: 4.97, TRY: 35, PLN: 4.3 };

export default function CurrencyCalc() {
  const [amount, setAmount] = useState("100");
  const [from, setFrom] = useState("EUR");
  const [to, setTo] = useState("BGN");

  const a = parseFloat(amount) || 0;
  const result = (a / RATES[from]) * RATES[to];
  const official = from === "EUR" && to === "BGN" || from === "BGN" && to === "EUR";

  return (
    <>
      <Link href="/tools" style={{ color: "var(--muted)", textDecoration: "none", fontSize: 13 }}>← Всички инструменти</Link>
      <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 26, fontWeight: 700, margin: "10px 0 20px" }}>Валутен калкулатор</h1>

      <div className="glass panel" style={{ padding: 28 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 14, alignItems: "end" }}>
          <div><label>Сума</label><input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
          <div><label>От</label><select value={from} onChange={(e) => setFrom(e.target.value)}>{Object.keys(RATES).map((c) => <option key={c}>{c}</option>)}</select></div>
          <div><label>Към</label><select value={to} onChange={(e) => setTo(e.target.value)}>{Object.keys(RATES).map((c) => <option key={c}>{c}</option>)}</select></div>
        </div>
        <div style={{ marginTop: 24, textAlign: "center", padding: "20px", background: "var(--emerald-soft)", borderRadius: 12 }}>
          <div className="num" style={{ fontSize: 32, fontWeight: 700, color: "var(--emerald-dark)" }}>{result.toFixed(2)} {to}</div>
          <div style={{ fontSize: 12.5, color: "var(--ink-soft)", marginTop: 4 }}>{a.toFixed(2)} {from} = {result.toFixed(2)} {to}</div>
        </div>
        <p style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 14 }}>
          {official ? "Курс EUR/BGN е фиксиран: 1 EUR = " + EUR_TO_BGN + " лв." : "Курсовете (без EUR/BGN) са ориентировъчни и подлежат на промяна."}
        </p>
      </div>
    </>
  );
}
