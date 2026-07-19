"use client";
import { NumberField } from "@/components/i18n/NumberField";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UiIcon } from "@/components/app/NavIcons";
import { confirmDelete } from "@/lib/confirmDelete";
import { useT } from "@/components/i18n/I18nProvider";

type Item = {
  id: string; name: string; sku: string | null; unit: string;
  quantity: number; minQuantity: number | null; unitCost: number | null; expiryDate: string | null;
  categoryId: string | null;
};

export function StockItemActions({ item, categories = [] }: { item: Item; categories?: { id: string; name: string }[] }) {
  const t = useT();
  const router = useRouter();
  const [edit, setEdit] = useState(false);
  const [f, setF] = useState(item);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function save() {
    setBusy(true); setErr("");
    const res = await fetch(`/api/warehouse/items/${item.id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: f.name, sku: f.sku, unit: f.unit, categoryId: f.categoryId || null,
        quantity: Number(f.quantity), minQuantity: f.minQuantity != null ? Number(f.minQuantity) : null,
        unitCost: f.unitCost != null ? Number(f.unitCost) : null,
        expiryDate: f.expiryDate || null,
      }),
    });
    setBusy(false);
    if (res.ok) { setEdit(false); router.refresh(); }
    else setErr((await res.json().catch(() => ({}))).error ?? t("warehouse.common.errSave"));
  }

  async function remove() {
    if (!(await confirmDelete(t("warehouse.actions.confirmDelete", { name: item.name })))) return;
    setBusy(true);
    const res = await fetch(`/api/warehouse/items/${item.id}`, { method: "DELETE" });
    setBusy(false);
    if (res.ok) router.push("/dashboard/warehouse");
    else alert((await res.json().catch(() => ({}))).error ?? t("warehouse.actions.errDelete"));
  }

  return (
    <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
      <button className="btn btn-ghost btn-sm" onClick={() => setEdit((v) => !v)} style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
        {edit ? t("warehouse.actions.close") : <><UiIcon.edit /> {t("warehouse.actions.edit")}</>}
      </button>
      <button className="btn btn-ghost btn-sm" onClick={remove} disabled={busy} title={t("warehouse.actions.delTitle")} style={{ color: "var(--brick)", borderColor: "var(--brick)", display: "inline-flex", alignItems: "center" }}>
        <UiIcon.trash />
      </button>

      {edit && (
        <div onClick={() => setEdit(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.4)", display: "flex", alignItems: "flex-start", justifyContent: "center", zIndex: 1000, padding: "16px", overflowY: "auto" }}>
          <div onClick={(e) => e.stopPropagation()} className="glass panel" style={{ width: "min(520px, 100%)", padding: 22, margin: "auto", maxHeight: "calc(100vh - 32px)", overflowY: "auto" }}>
            <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 17, margin: "0 0 14px" }}>{t("warehouse.actions.modalTitle")}</h3>
            {err && <div style={{ background: "var(--brick-soft)", color: "var(--brick)", borderRadius: 6, padding: "8px 12px", fontSize: 12.5, marginBottom: 12 }}>{err}</div>}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div style={{ gridColumn: "1 / -1" }}><label>{t("warehouse.actions.f.name")}</label><input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
              <div style={{ gridColumn: "1 / -1" }}><label>{t("warehouse.actions.f.category")}</label>
                <select value={f.categoryId ?? ""} onChange={(e) => setF({ ...f, categoryId: e.target.value || null })}>
                  <option value="">{t("warehouse.actions.noCategory")}</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div><label>{t("warehouse.actions.f.sku")}</label><input value={f.sku ?? ""} onChange={(e) => setF({ ...f, sku: e.target.value })} /></div>
              <div><label>{t("warehouse.actions.f.unit")}</label><input value={f.unit} onChange={(e) => setF({ ...f, unit: e.target.value })} /></div>
              <div><label>{t("warehouse.actions.f.qty")}</label><NumberField decimals={3} value={f.quantity} onValueChange={(n) => setF({ ...f, quantity: n ?? 0 })} /></div>
              <div><label>{t("warehouse.actions.f.minQty")}</label><NumberField decimals={3} value={f.minQuantity} onValueChange={(n) => setF({ ...f, minQuantity: n })} /></div>
              <div><label>{t("warehouse.actions.f.price")}</label><NumberField value={f.unitCost} onValueChange={(n) => setF({ ...f, unitCost: n })} /></div>
              <div><label>{t("warehouse.actions.f.expiry")}</label><input type="date" value={f.expiryDate?.slice(0, 10) ?? ""} onChange={(e) => setF({ ...f, expiryDate: e.target.value })} /></div>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 16, justifyContent: "flex-end" }}>
              <button className="btn btn-ghost btn-sm" onClick={() => setEdit(false)} disabled={busy}>{t("warehouse.actions.cancel")}</button>
              <button className="btn btn-primary btn-sm" onClick={save} disabled={busy}>{busy ? t("warehouse.actions.saving") : t("warehouse.actions.save")}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
