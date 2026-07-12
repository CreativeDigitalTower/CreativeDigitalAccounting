"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useT } from "@/components/i18n/I18nProvider";

type Item = { id: string; name: string; quantity: number; unit: string };
type Supplier = { id: string; name: string };

export default function ReceiveStockPage() {
  const t = useT();
  const router = useRouter();
  const [items, setItems] = useState<Item[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const selectedUnit = items.find((i) => i.id === selectedId)?.unit ?? "";

  useEffect(() => {
    fetch("/api/warehouse/items/list").then((r) => r.json()).then((d) => setItems(Array.isArray(d) ? d : [])).catch(() => {});
    fetch("/api/suppliers").then((r) => r.json()).then(setSuppliers).catch(() => {});
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true); setError("");
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/warehouse/receive", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        stockItemId: fd.get("stockItemId"),
        quantity: Number(fd.get("quantity")),
        unitPrice: fd.get("unitPrice") ? Number(fd.get("unitPrice")) : null,
        supplierId: fd.get("supplierId") || null,
        batchNumber: fd.get("batchNumber") || null,
        date: fd.get("date"),
        note: fd.get("note") || null,
      }),
    });
    setSaving(false);
    if (res.ok) router.push("/dashboard/warehouse");
    else setError((await res.json()).error ?? t("warehouse.common.errSave"));
  }

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
        <Link href="/dashboard/warehouse" style={{ color: "var(--muted)", textDecoration: "none", fontSize: 13 }}>{t("warehouse.common.back")}</Link>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 600, margin: 0 }}>{t("warehouse.receive.heading")}</h1>
      </div>
      {error && <div style={{ background: "var(--brick-soft)", border: "1px solid var(--brick)", color: "var(--brick)", borderRadius: 8, padding: "10px 14px", fontSize: 13, marginBottom: 16 }}>{error}</div>}
      {items.length === 0 && <div style={{ background: "var(--brass-soft)", border: "1px solid var(--brass)", color: "var(--brass)", borderRadius: 8, padding: "10px 14px", fontSize: 13, marginBottom: 16 }}>{t("warehouse.receive.noItems1")} <Link href="/dashboard/warehouse/items/new">{t("warehouse.receive.noItemsLink")}</Link>.</div>}
      <form onSubmit={handleSubmit}>
        <div className="glass panel" style={{ padding: 28, marginBottom: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px,1fr))", gap: 14 }}>
            <div style={{ gridColumn: "1 / -1" }}><label>{t("warehouse.receive.f.item")}</label>
              <select name="stockItemId" required value={selectedId} onChange={(e) => setSelectedId(e.target.value)}><option value="">{t("warehouse.common.select")}</option>{items.map((i)=><option key={i.id} value={i.id}>{t("warehouse.optStock", { name: i.name, q: i.quantity, u: i.unit })}</option>)}</select>
            </div>
            <div><label>{selectedUnit ? t("warehouse.receive.f.qtyIn", { unit: selectedUnit }) : t("warehouse.receive.f.qty")}</label><input type="number" name="quantity" step="0.01" min="0.01" required placeholder={selectedUnit ? t("warehouse.receive.f.qtyPhUnit", { unit: selectedUnit }) : t("warehouse.receive.f.qtyPh")} /></div>
            <div><label>{t("warehouse.receive.f.price")}</label><input type="number" name="unitPrice" step="0.01" min="0" /></div>
            <div><label>{t("warehouse.receive.f.supplier")}</label><select name="supplierId"><option value="">—</option>{suppliers.map((s)=><option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
            <div><label>{t("warehouse.receive.f.batch")}</label><input type="text" name="batchNumber" placeholder={t("warehouse.receive.f.batchPh")} /></div>
            <div><label>{t("warehouse.receive.f.date")}</label><input type="date" name="date" required defaultValue={new Date().toISOString().slice(0,10)} /></div>
            <div style={{ gridColumn: "1 / -1" }}><label>{t("warehouse.receive.f.note")}</label><input type="text" name="note" /></div>
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <Link href="/dashboard/warehouse" className="btn btn-ghost">{t("warehouse.common.cancel")}</Link>
          <button type="submit" className="btn btn-primary" disabled={saving || items.length === 0}>{saving ? t("warehouse.receive.saving") : t("warehouse.receive.save")}</button>
        </div>
      </form>
    </>
  );
}
