"use client";
import { useEffect, useState } from "react";
import { VAT_EXEMPT_REASONS } from "@/lib/constants";

export function VatSettings() {
  const [vatRegistered, setVatRegistered] = useState<boolean | null>(null);
  const [defaultVatExempt, setDefaultVatExempt] = useState(false);
  const [reason, setReason] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/company/vat-settings").then((r) => r.json()).then((d) => {
      setVatRegistered(!!d.vatRegistered);
      setDefaultVatExempt(!!d.defaultVatExempt);
      setReason(d.defaultVatExemptReason ?? "");
    });
  }, []);

  async function save(patch: Record<string, unknown>) {
    const body = { vatRegistered: vatRegistered ?? false, defaultVatExempt, defaultVatExemptReason: reason || null, ...patch };
    await fetch("/api/company/vat-settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    setSaved(true); setTimeout(() => setSaved(false), 1500);
  }

  if (vatRegistered === null) return null;

  return (
    <div className="glass panel" style={{ padding: "24px 28px", marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
        <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 17, fontWeight: 600, margin: 0 }}>ДДС настройки</h2>
        {saved && <span style={{ fontSize: 12, color: "var(--emerald-dark)" }}>Запазено ✓</span>}
      </div>
      <p style={{ fontSize: 12.5, color: "var(--muted)", margin: "0 0 16px" }}>Тези настройки се прилагат автоматично при създаване на всяка нова фактура. Можете да ги промените само за конкретна фактура.</p>

      <label style={{ fontSize: 12.5, fontWeight: 600, display: "block", marginBottom: 8 }}>Регистрация по ЗДДС</label>
      <div style={{ display: "flex", gap: 16, marginBottom: 16 }}>
        <label style={{ display: "flex", gap: 6, alignItems: "center", fontWeight: 400, cursor: "pointer" }}>
          <input type="radio" checked={vatRegistered === true} onChange={() => { setVatRegistered(true); save({ vatRegistered: true }); }} style={{ width: "auto" }} /> Регистрирана
        </label>
        <label style={{ display: "flex", gap: 6, alignItems: "center", fontWeight: 400, cursor: "pointer" }}>
          <input type="radio" checked={vatRegistered === false} onChange={() => { setVatRegistered(false); save({ vatRegistered: false }); }} style={{ width: "auto" }} /> Нерегистрирана
        </label>
      </div>

      {vatRegistered === false && (
        <div style={{ fontSize: 12.5, color: "var(--ink-soft)", background: "var(--brass-soft)", borderRadius: 8, padding: "10px 12px", marginBottom: 16 }}>
          Тъй като фирмата не е регистрирана по ЗДДС, новите фактури автоматично ще са без ДДС, с основание <strong>чл. 113, ал. 9 от ЗДДС</strong>.
        </div>
      )}

      <label style={{ display: "flex", gap: 8, alignItems: "center", fontWeight: 400, cursor: "pointer", marginBottom: 12 }}>
        <input type="checkbox" checked={defaultVatExempt} onChange={(e) => { setDefaultVatExempt(e.target.checked); save({ defaultVatExempt: e.target.checked }); }} style={{ width: "auto" }} />
        Не начислявай ДДС по подразбиране
      </label>

      {(defaultVatExempt || vatRegistered === false) && (
        <div style={{ maxWidth: 560 }}>
          <label style={{ fontSize: 12 }}>Основание по подразбиране</label>
          <select value={reason} onChange={(e) => { setReason(e.target.value); save({ defaultVatExemptReason: e.target.value || null }); }}>
            <option value="">— Изберете —</option>
            {VAT_EXEMPT_REASONS.filter((r) => r.code !== "other").map((r) => <option key={r.code} value={r.code}>{r.label}</option>)}
          </select>
        </div>
      )}
    </div>
  );
}
