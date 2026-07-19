"use client";

import { useState } from "react";
import Link from "next/link";
import { useT } from "@/components/i18n/I18nProvider";

export default function VatCalc() {
  const t = useT();
  const [amount, setAmount] = useState("100");
  const [rate, setRate] = useState(20);
  const [mode, setMode] = useState<"add" | "extract">("add");

  const a = parseFloat(amount) || 0;
  let net = 0, vat = 0, gross = 0;
  if (mode === "add") { net = a; vat = a * rate / 100; gross = net + vat; }
  else { gross = a; net = a / (1 + rate / 100); vat = gross - net; }

  return (
    <>
      <Link href="/tools" style={{ color: "var(--muted)", textDecoration: "none", fontSize: 13 }}>{t("tools.back")}</Link>
      <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 26, fontWeight: 700, margin: "10px 0 20px" }}>{t("tools.vat.name")}</h1>

      <div className="glass panel" style={{ padding: 28 }}>
        <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
          <button className={`filter-tab${mode === "add" ? " active" : ""}`} onClick={() => setMode("add")}>{t("tools.vatAddTab")}</button>
          <button className={`filter-tab${mode === "extract" ? " active" : ""}`} onClick={() => setMode("extract")}>{t("tools.vatExtractTab")}</button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div><label>{mode === "add" ? t("tools.vatAmountNet") : t("tools.vatAmountGross")}</label><input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
          <div><label>{t("tools.vatRate")}</label><select value={rate} onChange={(e) => setRate(Number(e.target.value))}><option value={20}>20%</option><option value={9}>9%</option><option value={0}>0%</option></select></div>
        </div>
        <div style={{ marginTop: 24, display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
          {[{ l: t("tools.net"), v: net }, { l: t("tools.vatLabel"), v: vat }, { l: t("tools.gross"), v: gross }].map((x) => (
            <div key={x.l} style={{ textAlign: "center", padding: "16px", background: "var(--emerald-soft)", borderRadius: 12 }}>
              <div style={{ fontSize: 12, color: "var(--ink-soft)", marginBottom: 4 }}>{x.l}</div>
              <div className="num" style={{ fontSize: 20, fontWeight: 700, color: "var(--emerald-dark)" }}>{x.v.toFixed(2)} €</div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
