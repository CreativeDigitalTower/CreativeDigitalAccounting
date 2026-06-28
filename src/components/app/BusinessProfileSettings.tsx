"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SECTORS, COMPANY_SIZES, getSector } from "@/lib/workspaces";

export function BusinessProfileSettings() {
  const router = useRouter();
  const [sector, setSector] = useState("");
  const [category, setCategory] = useState("");
  const [size, setSize] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    fetch("/api/company").then((r) => r.json()).then((c) => {
      setSector(c.businessSector ?? "");
      setCategory(c.businessCategory ?? "");
      setSize(c.companySize ?? "");
      setLoaded(true);
    }).catch(() => setLoaded(true));
  }, []);

  const subs = getSector(sector)?.subcategories ?? [];

  async function save() {
    if (!sector) { setMsg("Изберете сектор."); return; }
    const applyRecommended = confirm("Желаете ли да приложим препоръчителното подреждане на таблото за новия тип бизнес?\n\nОК = Да, приложи · Отказ = Запази сегашното ми табло");
    const res = await fetch("/api/business-profile", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ businessSector: sector, businessCategory: category || null, companySize: size || null, applyRecommended }),
    });
    if (res.ok) { setMsg("✓ Запазено"); router.refresh(); setTimeout(() => setMsg(""), 2500); }
    else setMsg("Грешка при запис.");
  }

  if (!loaded) return null;

  return (
    <div className="glass panel" style={{ padding: "24px 28px", marginBottom: 16 }}>
      <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 16, margin: "0 0 6px" }}>Бизнес профил (Smart Workspace)</h3>
      <p style={{ fontSize: 12.5, color: "var(--muted)", margin: "0 0 16px" }}>
        Определя само подреждането на началното табло — всички функции остават достъпни по всяко време.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px,1fr))", gap: 14 }}>
        <div>
          <label>Основен сектор</label>
          <select value={sector} onChange={(e) => { setSector(e.target.value); setCategory(""); }}>
            <option value="">— Изберете —</option>
            {SECTORS.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
          </select>
        </div>
        <div>
          <label>Подкатегория</label>
          <select value={category} onChange={(e) => setCategory(e.target.value)} disabled={!subs.length}>
            <option value="">— Изберете —</option>
            {subs.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label>Размер на бизнеса</label>
          <select value={size} onChange={(e) => setSize(e.target.value)}>
            <option value="">— Изберете —</option>
            {COMPANY_SIZES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </div>
      </div>
      <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 14 }}>
        <button className="btn btn-primary btn-sm" onClick={save}>Запази бизнес профила</button>
        {msg && <span style={{ fontSize: 12.5, color: msg.startsWith("✓") ? "var(--emerald)" : "var(--brick)" }}>{msg}</span>}
      </div>
    </div>
  );
}
