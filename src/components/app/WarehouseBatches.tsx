"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/components/i18n/I18nProvider";

export type ExpiringBatch = {
  id: string; itemName: string; batchNumber: string; quantity: number; unit: string;
  expiryDate: string; supplierName: string | null; status: "soon" | "expired"; days: number;
};
export type ReservedItem = { id: string; name: string; unit: string; quantity: number; reserved: number; free: number };
export type ReserveOption = { id: string; name: string; unit: string; free: number };

// Складови надстройки: изтичащи/изтекли партиди + резервирани/свободни количества.
// Отделен компонент — не променя съществуващия склад (без regression).
export function WarehouseBatches({ expiring, reserved, options }: {
  expiring: ExpiringBatch[]; reserved: ReservedItem[]; options: ReserveOption[];
}) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const [open, setOpen] = useState(true);
  const [selId, setSelId] = useState("");
  const [qty, setQty] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function act(stockItemId: string, action: "reserve" | "release", quantity: number) {
    setErr(""); setBusy(true);
    const res = await fetch("/api/warehouse/reserve", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ stockItemId, action, quantity }) });
    setBusy(false);
    if (res.ok) { setQty(""); setSelId(""); router.refresh(); }
    else setErr((await res.json().catch(() => ({}))).error ?? t("warehouse.batches.err"));
  }

  if (expiring.length === 0 && reserved.length === 0 && options.length === 0) return null;

  return (
    <div className="glass panel" style={{ padding: "16px 20px", marginBottom: 16 }}>
      <button onClick={() => setOpen((v) => !v)} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, padding: 0, marginBottom: open ? 12 : 0 }}>
        <span style={{ color: "var(--muted)", fontSize: 11 }}>{open ? "▼" : "▶"}</span>
        <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 16, margin: 0 }}>{t("warehouse.batches.title")}</h3>
      </button>

      {open && (
        <>
          {err && <div style={{ background: "var(--brick-soft)", color: "var(--brick)", borderRadius: 6, padding: "6px 10px", fontSize: 12, marginBottom: 10 }}>{err}</div>}

          {/* Изтичащи / изтекли партиди */}
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--brass)", letterSpacing: 1, margin: "4px 0 6px" }}>{t("warehouse.batches.expiringTitle")}</div>
          {expiring.length === 0 ? (
            <div style={{ fontSize: 12.5, color: "var(--muted)", marginBottom: 12 }}>{t("warehouse.batches.noExpiring")}</div>
          ) : (
            <div className="bi-table" style={{ overflowX: "auto", marginBottom: 14 }}>
              <table>
                <thead><tr>
                  <th>{t("warehouse.batches.item")}</th><th>{t("warehouse.batches.batch")}</th><th className="num">{t("warehouse.batches.qty")}</th>
                  <th>{t("warehouse.batches.supplier")}</th><th>{t("warehouse.batches.expiry")}</th>
                </tr></thead>
                <tbody>
                  {expiring.map((b) => (
                    <tr key={b.id}>
                      <td style={{ fontWeight: 600 }}>{b.itemName}</td>
                      <td>{b.batchNumber}</td>
                      <td className="num">{b.quantity} {b.unit}</td>
                      <td style={{ fontSize: 12.5 }}>{b.supplierName ?? "—"}</td>
                      <td style={{ fontSize: 12.5, fontWeight: 700, color: b.status === "expired" ? "var(--brick)" : "var(--brass)" }}>
                        {new Date(b.expiryDate).toLocaleDateString(locale)} · {b.status === "expired" ? t("warehouse.batches.expired", { d: -b.days }) : t("warehouse.batches.expiresIn", { d: b.days })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Резервирани количества */}
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--brass)", letterSpacing: 1, margin: "4px 0 6px" }}>{t("warehouse.batches.reservedTitle")}</div>
          {reserved.length === 0 ? (
            <div style={{ fontSize: 12.5, color: "var(--muted)", marginBottom: 12 }}>{t("warehouse.batches.noReserved")}</div>
          ) : (
            <div className="bi-table" style={{ overflowX: "auto", marginBottom: 12 }}>
              <table>
                <thead><tr>
                  <th>{t("warehouse.batches.item")}</th><th className="num">{t("warehouse.batches.available")}</th>
                  <th className="num">{t("warehouse.batches.reserved")}</th><th className="num">{t("warehouse.batches.free")}</th><th></th>
                </tr></thead>
                <tbody>
                  {reserved.map((r) => (
                    <tr key={r.id}>
                      <td style={{ fontWeight: 600 }}>{r.name}</td>
                      <td className="num">{r.quantity} {r.unit}</td>
                      <td className="num" style={{ color: "var(--brass)" }}>{r.reserved} {r.unit}</td>
                      <td className="num" style={{ fontWeight: 700 }}>{r.free} {r.unit}</td>
                      <td style={{ textAlign: "right" }}>
                        <button className="btn btn-ghost btn-sm" disabled={busy} onClick={() => act(r.id, "release", r.reserved)}>{t("warehouse.batches.release")}</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Ново резервиране */}
          {options.length > 0 && (
            <div style={{ display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap" }}>
              <div><label style={{ fontSize: 11 }}>{t("warehouse.batches.reserveItem")}</label>
                <select value={selId} onChange={(e) => setSelId(e.target.value)} style={{ padding: "6px 8px", fontSize: 12.5 }}>
                  <option value="">—</option>
                  {options.map((o) => <option key={o.id} value={o.id}>{o.name} ({t("warehouse.batches.freeShort", { n: o.free, unit: o.unit })})</option>)}
                </select>
              </div>
              <div><label style={{ fontSize: 11 }}>{t("warehouse.batches.reserveQty")}</label>
                <input value={qty} onChange={(e) => setQty(e.target.value)} inputMode="decimal" style={{ padding: "6px 8px", fontSize: 12.5, width: 90 }} />
              </div>
              <button className="btn btn-primary btn-sm" disabled={busy || !selId || !(Number(qty) > 0)} onClick={() => act(selId, "reserve", Number(qty))}>{t("warehouse.batches.reserve")}</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
