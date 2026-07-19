"use client";

import { useState } from "react";
import Link from "next/link";
import { NumberField } from "@/components/i18n/NumberField";
import { useT } from "@/components/i18n/I18nProvider";

export default function InterestCalc() {
  const t = useT();
  const [principal, setPrincipal] = useState("10000");
  const [rate, setRate] = useState("5");
  const [years, setYears] = useState("3");
  const [type, setType] = useState<"simple" | "compound">("compound");

  const p = parseFloat(principal) || 0;
  const r = (parseFloat(rate) || 0) / 100;
  const yr = parseFloat(years) || 0;

  const final = type === "simple" ? p * (1 + r * yr) : p * Math.pow(1 + r, yr);
  const interest = final - p;

  return (
    <>
      <Link href="/tools" style={{ color: "var(--muted)", textDecoration: "none", fontSize: 13 }}>{t("tools.back")}</Link>
      <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 26, fontWeight: 700, margin: "10px 0 20px" }}>{t("tools.interest.name")}</h1>

      <div className="glass panel" style={{ padding: 28 }}>
        <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
          <button className={`filter-tab${type === "simple" ? " active" : ""}`} onClick={() => setType("simple")}>{t("tools.simpleTab")}</button>
          <button className={`filter-tab${type === "compound" ? " active" : ""}`} onClick={() => setType("compound")}>{t("tools.compoundTab")}</button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14 }}>
          <div><label>{t("tools.principal")}</label><NumberField value={principal} onChange={setPrincipal} /></div>
          <div><label>{t("tools.annualRate")}</label><NumberField value={rate} onChange={setRate} /></div>
          <div><label>{t("tools.periodYears")}</label><NumberField value={years} onChange={setYears} /></div>
        </div>
        <div style={{ marginTop: 24, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div style={{ textAlign: "center", padding: 18, background: "var(--brass-soft)", borderRadius: 12 }}>
            <div style={{ fontSize: 12, color: "var(--ink-soft)" }}>{t("tools.accruedInterest")}</div>
            <div className="num" style={{ fontSize: 22, fontWeight: 700, color: "var(--brass)" }}>{interest.toFixed(2)}</div>
          </div>
          <div style={{ textAlign: "center", padding: 18, background: "var(--emerald-soft)", borderRadius: 12 }}>
            <div style={{ fontSize: 12, color: "var(--ink-soft)" }}>{t("tools.finalAmount")}</div>
            <div className="num" style={{ fontSize: 22, fontWeight: 700, color: "var(--emerald-dark)" }}>{final.toFixed(2)}</div>
          </div>
        </div>
      </div>
    </>
  );
}
