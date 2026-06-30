"use client";
import { useEffect, useState } from "react";

export function DocSharingSetting() {
  const [on, setOn] = useState<boolean | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => { fetch("/api/company/doc-sharing").then((r) => r.json()).then((d) => setOn(d.shareDocsInternally)); }, []);

  async function toggle(v: boolean) {
    setOn(v);
    await fetch("/api/company/doc-sharing", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ shareDocsInternally: v }) });
    setSaved(true); setTimeout(() => setSaved(false), 1500);
  }

  return (
    <div className="glass panel" style={{ padding: "24px 28px", marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
        <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 17, fontWeight: 600, margin: 0 }}>Обмен на документи между фирми</h2>
        {saved && <span style={{ fontSize: 12, color: "var(--emerald-dark)" }}>Запазено ✓</span>}
      </div>
      <p style={{ fontSize: 12.5, color: "var(--muted)", margin: "0 0 14px" }}>
        Когато издавате документ към фирма, която също е регистрирана в платформата (по ЕИК), той автоматично се доставя във входящата ѝ кутия и тя получава известие.
      </p>
      <label style={{ display: "flex", gap: 10, alignItems: "flex-start", cursor: "pointer" }}>
        <input type="checkbox" checked={on ?? true} onChange={(e) => toggle(e.target.checked)} style={{ marginTop: 3, width: 16, height: 16 }} />
        <div>
          <div style={{ fontWeight: 600, fontSize: 13.5 }}>Изпращай документите през платформата</div>
          <div style={{ fontSize: 12, color: "var(--muted)" }}>Изключете, ако предпочитате да изпращате документите си лично (по имейл/на ръка).</div>
        </div>
      </label>
    </div>
  );
}
