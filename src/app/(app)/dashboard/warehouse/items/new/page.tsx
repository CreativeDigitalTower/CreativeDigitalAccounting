"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { STOCK_UNITS } from "@/lib/constants";
import { useT } from "@/components/i18n/I18nProvider";

type Warehouse = { id: string; name: string };
type Cat = { id: string; name: string };

export default function NewStockItemPage() {
  const t = useT();
  const router = useRouter();
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [categories, setCategories] = useState<Cat[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [noExpiry, setNoExpiry] = useState(true);

  useEffect(() => {
    fetch("/api/warehouses").then((r) => r.json()).then((d) => setWarehouses(Array.isArray(d) ? d : [])).catch(() => {});
    fetch("/api/stock-categories").then((r) => r.ok ? r.json() : []).then((d) => setCategories(Array.isArray(d) ? d : [])).catch(() => {});
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true); setError("");
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/warehouse/items", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        warehouseId: fd.get("warehouseId"),
        categoryId: fd.get("categoryId") || null,
        name: fd.get("name"), sku: fd.get("sku") || null,
        quantity: fd.get("quantity") ? Number(fd.get("quantity")) : 0,
        minQuantity: fd.get("minQuantity") ? Number(fd.get("minQuantity")) : null,
        unit: fd.get("unit") || "бр",
        unitCost: fd.get("unitCost") ? Number(fd.get("unitCost")) : null,
        expiryDate: noExpiry ? null : (fd.get("expiryDate") || null),
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
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 600, margin: 0 }}>{t("warehouse.itemsNew.heading")}</h1>
      </div>
      {error && <div style={{ background: "var(--brick-soft)", border: "1px solid var(--brick)", color: "var(--brick)", borderRadius: 8, padding: "10px 14px", fontSize: 13, marginBottom: 16 }}>{error}</div>}
      {warehouses.length === 0 && <div style={{ background: "var(--brass-soft)", border: "1px solid var(--brass)", color: "var(--brass)", borderRadius: 8, padding: "10px 14px", fontSize: 13, marginBottom: 16 }}>{t("warehouse.itemsNew.noWarehouse")}</div>}
      <form onSubmit={handleSubmit}>
        <div className="glass panel" style={{ padding: 28, marginBottom: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px,1fr))", gap: 14 }}>
            <div><label>{t("warehouse.itemsNew.f.warehouse")}</label><select name="warehouseId" required>{warehouses.map((w)=><option key={w.id} value={w.id}>{w.name}</option>)}</select></div>
            {categories.length > 0 && (
              <div><label>{t("warehouse.itemsNew.f.category")}</label><select name="categoryId"><option value="">—</option>{categories.map((c)=><option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
            )}
            <div style={{ gridColumn: "1 / -1" }}><label>{t("warehouse.itemsNew.f.name")}</label><input type="text" name="name" required /></div>
            <div><label>{t("warehouse.itemsNew.f.sku")}</label><input type="text" name="sku" /></div>
            <div><label>{t("warehouse.itemsNew.f.unit")}</label><select name="unit" defaultValue="бр">{STOCK_UNITS.map((u) => <option key={u} value={u}>{u}</option>)}</select></div>
            <div><label>{t("warehouse.itemsNew.f.qty")}</label><input type="number" name="quantity" step="0.01" min="0" defaultValue={0} /></div>
            <div><label>{t("warehouse.itemsNew.f.minQty")}</label><input type="number" name="minQuantity" step="0.01" min="0" /></div>
            <div><label>{t("warehouse.itemsNew.f.price")}</label><input type="number" name="unitCost" step="0.01" min="0" /></div>
            <div style={{ gridColumn: "1 / -1", borderTop: "1px solid var(--border)", paddingTop: 12 }}>
              <label>{t("warehouse.itemsNew.f.expiryTitle")}</label>
              <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13, fontWeight: 400, marginBottom: 8 }}>
                <input type="checkbox" checked={noExpiry} onChange={(e) => setNoExpiry(e.target.checked)} style={{ width: "auto" }} /> {t("warehouse.itemsNew.f.noExpiry")}
              </label>
              {!noExpiry && <input type="date" name="expiryDate" required style={{ maxWidth: 220 }} />}
              <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 4 }}>{t("warehouse.itemsNew.f.expiryHint")}</div>
            </div>
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <Link href="/dashboard/warehouse" className="btn btn-ghost">{t("warehouse.common.cancel")}</Link>
          <button type="submit" className="btn btn-primary" disabled={saving || warehouses.length === 0}>{saving ? t("warehouse.itemsNew.saving") : t("warehouse.itemsNew.save")}</button>
        </div>
      </form>
    </>
  );
}
