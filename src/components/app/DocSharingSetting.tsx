"use client";
import { useEffect, useState } from "react";
import { useT } from "@/components/i18n/I18nProvider";

export function DocSharingSetting() {
  const t = useT();
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
        <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 17, fontWeight: 600, margin: 0 }}>{t("account.docSharing.title")}</h2>
        {saved && <span style={{ fontSize: 12, color: "var(--emerald-dark)" }}>{t("account.docSharing.saved")}</span>}
      </div>
      <p style={{ fontSize: 12.5, color: "var(--muted)", margin: "0 0 14px" }}>
        {t("account.docSharing.subtitle")}
      </p>
      <label style={{ display: "flex", gap: 10, alignItems: "flex-start", cursor: "pointer" }}>
        <input type="checkbox" checked={on ?? true} onChange={(e) => toggle(e.target.checked)} style={{ marginTop: 3, width: 16, height: 16 }} />
        <div>
          <div style={{ fontWeight: 600, fontSize: 13.5 }}>{t("account.docSharing.toggle")}</div>
          <div style={{ fontSize: 12, color: "var(--muted)" }}>{t("account.docSharing.toggleHint")}</div>
        </div>
      </label>
    </div>
  );
}
