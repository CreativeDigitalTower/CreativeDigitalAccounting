"use client";
import { useEffect, useState } from "react";
import { EMAIL_PREFS } from "@/lib/email/prefs";
import { useT } from "@/components/i18n/I18nProvider";

export function EmailPreferences() {
  const t = useT();
  const [prefs, setPrefs] = useState<Record<string, boolean> | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => { fetch("/api/company/email-prefs").then((r) => r.json()).then(setPrefs); }, []);

  async function toggle(cat: string, val: boolean) {
    const next = { ...(prefs ?? {}), [cat]: val };
    setPrefs(next);
    await fetch("/api/company/email-prefs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(next) });
    setSaved(true); setTimeout(() => setSaved(false), 1500);
  }

  return (
    <div className="glass panel" style={{ padding: "24px 28px", marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
        <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 17, fontWeight: 600, margin: 0 }}>{t("account.email.title")}</h2>
        {saved && <span style={{ fontSize: 12, color: "var(--emerald-dark)" }}>{t("account.email.saved")}</span>}
      </div>
      <p style={{ fontSize: 12.5, color: "var(--muted)", margin: "0 0 16px" }}>
        {t("account.email.subtitle")}
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {EMAIL_PREFS.map((p) => {
          const on = prefs ? prefs[p.category] !== false : p.default;
          return (
            <label key={p.key} style={{ display: "flex", gap: 12, alignItems: "flex-start", cursor: "pointer" }}>
              <input type="checkbox" checked={on} onChange={(e) => toggle(p.category, e.target.checked)} style={{ marginTop: 3, width: 16, height: 16 }} />
              <div>
                <div style={{ fontWeight: 600, fontSize: 13.5 }}>{p.label}</div>
                <div style={{ fontSize: 12, color: "var(--muted)" }}>{p.description}</div>
              </div>
            </label>
          );
        })}
      </div>
    </div>
  );
}
