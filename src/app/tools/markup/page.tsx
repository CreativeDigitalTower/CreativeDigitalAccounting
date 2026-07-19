"use client";

import { useState } from "react";
import Link from "next/link";
import { NumberField } from "@/components/i18n/NumberField";
import { useT } from "@/components/i18n/I18nProvider";

export default function MarkupCalc() {
  const t = useT();
  const [cost, setCost] = useState("100");
  const [markup, setMarkup] = useState("30");

  const c = parseFloat(cost) || 0;
  const m = parseFloat(markup) || 0;
  const price = c * (1 + m / 100);
  const profit = price - c;
  const margin = price > 0 ? (profit / price) * 100 : 0;

  return (
    <>
      <Link href="/tools" style={{ color: "var(--muted)", textDecoration: "none", fontSize: 13 }}>{t("tools.back")}</Link>
      <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 26, fontWeight: 700, margin: "10px 0 20px" }}>{t("tools.markup.name")}</h1>

      <div className="glass panel" style={{ padding: 28 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div><label>{t("tools.cost")}</label><NumberField value={cost} onChange={setCost} /></div>
          <div><label>{t("tools.markupPct")}</label><NumberField value={markup} onChange={setMarkup} /></div>
        </div>
        <div style={{ marginTop: 24, display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
          {[
            { l: t("tools.sellPrice"), v: price.toFixed(2), c: "var(--emerald-dark)", bg: "var(--emerald-soft)" },
            { l: t("tools.profit"), v: profit.toFixed(2), c: "var(--brass)", bg: "var(--brass-soft)" },
            { l: t("tools.margin"), v: margin.toFixed(1) + "%", c: "var(--navy)", bg: "var(--navy-soft)" },
          ].map((x) => (
            <div key={x.l} style={{ textAlign: "center", padding: 18, background: x.bg, borderRadius: 12 }}>
              <div style={{ fontSize: 12, color: "var(--ink-soft)" }}>{x.l}</div>
              <div className="num" style={{ fontSize: 20, fontWeight: 700, color: x.c }}>{x.v}</div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
