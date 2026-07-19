"use client";

import { useState } from "react";
import Link from "next/link";
import { NumberField } from "@/components/i18n/NumberField";
import { useT } from "@/components/i18n/I18nProvider";
import { EUR_TO_BGN } from "@/lib/constants";

// Ориентировъчни курсове спрямо EUR (BGN е фиксиран по закон)
const RATES: Record<string, number> = { EUR: 1, BGN: EUR_TO_BGN, USD: 1.08, GBP: 0.85, CHF: 0.94, RON: 4.97, TRY: 35, PLN: 4.3 };

export default function CurrencyCalc() {
  const t = useT();
  const [amount, setAmount] = useState("100");
  const [from, setFrom] = useState("EUR");
  const [to, setTo] = useState("BGN");

  const a = parseFloat(amount) || 0;
  const result = (a / RATES[from]) * RATES[to];
  const official = from === "EUR" && to === "BGN" || from === "BGN" && to === "EUR";

  return (
    <>
      <Link href="/tools" style={{ color: "var(--muted)", textDecoration: "none", fontSize: 13 }}>{t("tools.back")}</Link>
      <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 26, fontWeight: 700, margin: "10px 0 20px" }}>{t("tools.currency.name")}</h1>

      <div className="glass panel" style={{ padding: 28 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 14, alignItems: "end" }}>
          <div><label>{t("tools.amount")}</label><NumberField value={amount} onChange={setAmount} /></div>
          <div><label>{t("tools.from")}</label><select value={from} onChange={(e) => setFrom(e.target.value)}>{Object.keys(RATES).map((c) => <option key={c}>{c}</option>)}</select></div>
          <div><label>{t("tools.to")}</label><select value={to} onChange={(e) => setTo(e.target.value)}>{Object.keys(RATES).map((c) => <option key={c}>{c}</option>)}</select></div>
        </div>
        <div style={{ marginTop: 24, textAlign: "center", padding: "20px", background: "var(--emerald-soft)", borderRadius: 12 }}>
          <div className="num" style={{ fontSize: 32, fontWeight: 700, color: "var(--emerald-dark)" }}>{result.toFixed(2)} {to}</div>
          <div style={{ fontSize: 12.5, color: "var(--ink-soft)", marginTop: 4 }}>{a.toFixed(2)} {from} = {result.toFixed(2)} {to}</div>
        </div>
        <p style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 14 }}>
          {official ? t("tools.fixedNote", { rate: EUR_TO_BGN }) : t("tools.estNote")}
        </p>
      </div>
    </>
  );
}
