"use client";

import { useState } from "react";
import { EUR_TO_BGN } from "@/lib/constants";

const box = { textAlign: "center" as const, padding: 18, borderRadius: 12 };

export function CurrencyCalc() {
  const RATES: Record<string, number> = { EUR: 1, BGN: EUR_TO_BGN, USD: 1.08, GBP: 0.85, CHF: 0.94, RON: 4.97, TRY: 35, PLN: 4.3 };
  const [amount, setAmount] = useState("100");
  const [from, setFrom] = useState("EUR");
  const [to, setTo] = useState("BGN");
  const a = parseFloat(amount) || 0;
  const result = (a / RATES[from]) * RATES[to];
  const official = (from === "EUR" && to === "BGN") || (from === "BGN" && to === "EUR");
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 14, alignItems: "end" }}>
        <div><label>Сума</label><input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
        <div><label>От</label><select value={from} onChange={(e) => setFrom(e.target.value)}>{Object.keys(RATES).map((c) => <option key={c}>{c}</option>)}</select></div>
        <div><label>Към</label><select value={to} onChange={(e) => setTo(e.target.value)}>{Object.keys(RATES).map((c) => <option key={c}>{c}</option>)}</select></div>
      </div>
      <div style={{ marginTop: 24, textAlign: "center", padding: 20, background: "var(--emerald-soft)", borderRadius: 12 }}>
        <div className="num" style={{ fontSize: 32, fontWeight: 700, color: "var(--emerald-dark)" }}>{result.toFixed(2)} {to}</div>
        <div style={{ fontSize: 12.5, color: "var(--ink-soft)", marginTop: 4 }}>{a.toFixed(2)} {from} = {result.toFixed(2)} {to}</div>
      </div>
      <p style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 14 }}>
        {official ? `Курс EUR/BGN е фиксиран: 1 EUR = ${EUR_TO_BGN} лв.` : "Курсовете (без EUR/BGN) са ориентировъчни и подлежат на промяна."}
      </p>
    </div>
  );
}

export function VatCalc() {
  const [amount, setAmount] = useState("100");
  const [rate, setRate] = useState(20);
  const [mode, setMode] = useState<"add" | "extract">("add");
  const a = parseFloat(amount) || 0;
  let net = 0, vat = 0, gross = 0;
  if (mode === "add") { net = a; vat = a * rate / 100; gross = net + vat; }
  else { gross = a; net = a / (1 + rate / 100); vat = gross - net; }
  return (
    <div>
      <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
        <button className={`filter-tab${mode === "add" ? " active" : ""}`} onClick={() => setMode("add")}>Начисли ДДС (към нето)</button>
        <button className={`filter-tab${mode === "extract" ? " active" : ""}`} onClick={() => setMode("extract")}>Извади ДДС (от бруто)</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <div><label>{mode === "add" ? "Сума без ДДС" : "Сума с ДДС"}</label><input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
        <div><label>ДДС ставка</label><select value={rate} onChange={(e) => setRate(Number(e.target.value))}><option value={20}>20%</option><option value={9}>9%</option><option value={0}>0%</option></select></div>
      </div>
      <div style={{ marginTop: 24, display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
        {[{ l: "Нето", v: net }, { l: "ДДС", v: vat }, { l: "Бруто", v: gross }].map((x) => (
          <div key={x.l} style={{ ...box, background: "var(--emerald-soft)" }}>
            <div style={{ fontSize: 12, color: "var(--ink-soft)", marginBottom: 4 }}>{x.l}</div>
            <div className="num" style={{ fontSize: 20, fontWeight: 700, color: "var(--emerald-dark)" }}>{x.v.toFixed(2)} €</div>
          </div>
        ))}
      </div>
    </div>
  );
}

const EMPLOYEE_INS = 0.1378, EMPLOYER_INS = 0.1892, TAX = 0.10, MAX_INS_BASE = 4130;
export function SalaryCalc() {
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
    { l: "Нето заплата (на ръка)", v: net, strong: true },
  ];
  return (
    <div>
      <div style={{ maxWidth: 280 }}><label>Бруто заплата (BGN/EUR)</label><input type="number" value={gross} onChange={(e) => setGross(e.target.value)} /></div>
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
        Стойностите са ориентировъчни и зависят от категорията труд, осигурителния доход и конкретни обстоятелства.
      </p>
    </div>
  );
}

export function InterestCalc() {
  const [principal, setPrincipal] = useState("10000");
  const [rate, setRate] = useState("5");
  const [years, setYears] = useState("3");
  const [type, setType] = useState<"simple" | "compound">("compound");
  const p = parseFloat(principal) || 0, r = (parseFloat(rate) || 0) / 100, t = parseFloat(years) || 0;
  const final = type === "simple" ? p * (1 + r * t) : p * Math.pow(1 + r, t);
  const interest = final - p;
  return (
    <div>
      <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
        <button className={`filter-tab${type === "simple" ? " active" : ""}`} onClick={() => setType("simple")}>Проста лихва</button>
        <button className={`filter-tab${type === "compound" ? " active" : ""}`} onClick={() => setType("compound")}>Сложна лихва</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14 }}>
        <div><label>Главница</label><input type="number" value={principal} onChange={(e) => setPrincipal(e.target.value)} /></div>
        <div><label>Год. лихва (%)</label><input type="number" value={rate} onChange={(e) => setRate(e.target.value)} /></div>
        <div><label>Период (години)</label><input type="number" value={years} onChange={(e) => setYears(e.target.value)} /></div>
      </div>
      <div style={{ marginTop: 24, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div style={{ ...box, background: "var(--brass-soft)" }}><div style={{ fontSize: 12, color: "var(--ink-soft)" }}>Натрупана лихва</div><div className="num" style={{ fontSize: 22, fontWeight: 700, color: "var(--brass)" }}>{interest.toFixed(2)}</div></div>
        <div style={{ ...box, background: "var(--emerald-soft)" }}><div style={{ fontSize: 12, color: "var(--ink-soft)" }}>Крайна сума</div><div className="num" style={{ fontSize: 22, fontWeight: 700, color: "var(--emerald-dark)" }}>{final.toFixed(2)}</div></div>
      </div>
    </div>
  );
}

export function MarkupCalc() {
  const [cost, setCost] = useState("100");
  const [markup, setMarkup] = useState("30");
  const c = parseFloat(cost) || 0, m = parseFloat(markup) || 0;
  const price = c * (1 + m / 100);
  const profit = price - c;
  const margin = price > 0 ? (profit / price) * 100 : 0;
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <div><label>Себестойност</label><input type="number" value={cost} onChange={(e) => setCost(e.target.value)} /></div>
        <div><label>Надценка (%)</label><input type="number" value={markup} onChange={(e) => setMarkup(e.target.value)} /></div>
      </div>
      <div style={{ marginTop: 24, display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
        {[
          { l: "Продажна цена", v: price.toFixed(2), c: "var(--emerald-dark)", bg: "var(--emerald-soft)" },
          { l: "Печалба", v: profit.toFixed(2), c: "var(--brass)", bg: "var(--brass-soft)" },
          { l: "Марж", v: margin.toFixed(1) + "%", c: "var(--navy)", bg: "var(--navy-soft)" },
        ].map((x) => (
          <div key={x.l} style={{ ...box, background: x.bg }}><div style={{ fontSize: 12, color: "var(--ink-soft)" }}>{x.l}</div><div className="num" style={{ fontSize: 20, fontWeight: 700, color: x.c }}>{x.v}</div></div>
        ))}
      </div>
    </div>
  );
}

export const TOOL_TABS = [
  { id: "currency", label: "Валутен калкулатор", Comp: CurrencyCalc },
  { id: "salary", label: "Калкулатор за заплати", Comp: SalaryCalc },
  { id: "vat", label: "ДДС калкулатор", Comp: VatCalc },
  { id: "interest", label: "Лихвен калкулатор", Comp: InterestCalc },
  { id: "markup", label: "Надценка и печалба", Comp: MarkupCalc },
];

export function ToolsTabs() {
  const [active, setActive] = useState(TOOL_TABS[0].id);
  const Active = TOOL_TABS.find((t) => t.id === active)!.Comp;
  return (
    <div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 18 }}>
        {TOOL_TABS.map((t) => (
          <button key={t.id} className={`filter-tab${active === t.id ? " active" : ""}`} onClick={() => setActive(t.id)}>{t.label}</button>
        ))}
      </div>
      <div className="glass panel" style={{ padding: 28 }}><Active /></div>
    </div>
  );
}
