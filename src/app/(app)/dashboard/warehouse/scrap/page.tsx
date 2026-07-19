"use client";
import { toNumber } from "@/lib/number";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useI18n } from "@/components/i18n/I18nProvider";

type Item = { id: string; name: string; quantity: number; unit: string };
type ScrapRow = { id: string; name: string; unit: string; quantity: number; date: string; note: string | null; value: number | null };

export default function ScrapStockPage() {
  const { t, locale } = useI18n();
  const router = useRouter();
  const [items, setItems] = useState<Item[]>([]);
  const [history, setHistory] = useState<ScrapRow[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/warehouse/items/list").then((r) => r.json()).then((d) => setItems(Array.isArray(d) ? d : [])).catch(() => {});
    fetch("/api/warehouse/scrap").then((r) => r.json()).then((d) => setHistory(Array.isArray(d) ? d : [])).catch(() => {});
  }, []);

  const selected = items.find((i) => i.id === selectedId);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true); setError("");
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/warehouse/scrap", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stockItemId: fd.get("stockItemId"), quantity: toNumber(fd.get("quantity")), date: fd.get("date"), note: fd.get("note") || null }),
    });
    setSaving(false);
    if (res.ok) router.push("/dashboard/warehouse");
    else setError((await res.json()).error ?? t("warehouse.common.errSave"));
  }

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
        <Link href="/dashboard/warehouse" style={{ color: "var(--muted)", textDecoration: "none", fontSize: 13 }}>{t("warehouse.common.back")}</Link>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 600, margin: 0 }}>{t("warehouse.scrap.heading")}</h1>
      </div>
      {error && <div style={{ background: "var(--brick-soft)", border: "1px solid var(--brick)", color: "var(--brick)", borderRadius: 8, padding: "10px 14px", fontSize: 13, marginBottom: 16 }}>{error}</div>}
      <form onSubmit={handleSubmit} className="glass panel" style={{ padding: "24px 28px", maxWidth: 560, display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <label>{t("warehouse.scrap.f.item")}</label>
          <select name="stockItemId" required value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
            <option value="">{t("warehouse.common.selectItem")}</option>
            {items.map((i) => <option key={i.id} value={i.id}>{t("warehouse.optAvail", { name: i.name, q: i.quantity, u: i.unit })}</option>)}
          </select>
          {selected && <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>{t("warehouse.scrap.f.avail")} <strong>{selected.quantity} {selected.unit}</strong></div>}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div><label>{selected ? t("warehouse.scrap.f.qtyIn", { unit: selected.unit }) : t("warehouse.scrap.f.qty")}</label><input type="text" inputMode="decimal" name="quantity" required placeholder={selected ? t("warehouse.scrap.f.qtyPhUnit", { unit: selected.unit }) : t("warehouse.scrap.f.qtyPh")} /></div>
          <div><label>{t("warehouse.scrap.f.date")}</label><input type="date" name="date" defaultValue={new Date().toISOString().slice(0, 10)} required /></div>
        </div>
        <div><label>{t("warehouse.scrap.f.reason")}</label><input type="text" name="note" placeholder={t("warehouse.scrap.f.reasonPh")} /></div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <Link href="/dashboard/warehouse" className="btn btn-ghost">{t("warehouse.common.cancel")}</Link>
          <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? t("warehouse.scrap.saving") : t("warehouse.scrap.save")}</button>
        </div>
      </form>

      {/* Архив с бракуванията */}
      <div style={{ marginTop: 24, maxWidth: 760 }}>
        <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 18, fontWeight: 600, margin: "0 0 10px" }}>{t("warehouse.scrap.archiveTitle", { n: history.length })}</h2>
        <div className="glass panel" style={{ padding: "8px 0" }}>
          {history.length === 0 ? (
            <div style={{ fontSize: 13, color: "var(--muted)", padding: "16px" }}>{t("warehouse.scrap.empty")}</div>
          ) : (
            <table>
              <thead><tr><th>{t("warehouse.scrap.th.date")}</th><th>{t("warehouse.scrap.th.item")}</th><th className="num">{t("warehouse.scrap.th.qty")}</th><th>{t("warehouse.scrap.th.reason")}</th></tr></thead>
              <tbody>
                {history.map((h) => (
                  <tr key={h.id}>
                    <td style={{ fontSize: 13 }}>{new Date(h.date).toLocaleDateString(locale)}</td>
                    <td style={{ fontWeight: 600 }}>{h.name}</td>
                    <td className="num" style={{ color: "var(--brick)", fontWeight: 600 }}>−{h.quantity} {h.unit}</td>
                    <td style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>{h.note ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}
