"use client";
import { useState } from "react";
import { signOut } from "next-auth/react";
import { useT } from "@/components/i18n/I18nProvider";

export function DangerZone() {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const canDelete = agree && reason.trim().length >= 3 && confirmText.trim().toUpperCase() === t("account.danger.deleteWord").toUpperCase();

  async function del() {
    setError(""); setBusy(true);
    const res = await fetch("/api/company/delete", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason, confirm: true }),
    });
    if (res.ok) { await signOut({ callbackUrl: "/" }); return; }
    setBusy(false);
    setError((await res.json()).error ?? t("account.danger.errDelete"));
  }

  return (
    <div className="glass panel" style={{ padding: "24px 28px", marginBottom: 16, border: "1px solid rgba(178,59,59,.4)" }}>
      <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 17, fontWeight: 600, margin: "0 0 4px", color: "var(--brick)" }}>{t("account.danger.title")}</h2>
      <p style={{ fontSize: 12.5, color: "var(--muted)", margin: "0 0 14px" }} dangerouslySetInnerHTML={{ __html: t("account.danger.subtitle") }} />
      {!open ? (
        <button className="btn btn-ghost btn-sm" style={{ color: "var(--brick)", borderColor: "var(--brick)" }} onClick={() => setOpen(true)}>{t("account.danger.openBtn")}</button>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 460 }}>
          {error && <div style={{ background: "var(--brick-soft)", color: "var(--brick)", borderRadius: 8, padding: "8px 12px", fontSize: 12.5 }}>{error}</div>}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600 }}>{t("account.danger.reasonLabel")}</label>
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} placeholder={t("account.danger.reasonPh")} style={{ width: "100%" }} />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600 }} dangerouslySetInnerHTML={{ __html: t("account.danger.confirmLabel") }} />
            <input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder={t("account.danger.deleteWord")} />
          </div>
          <label style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 12.5, cursor: "pointer" }}>
            <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} style={{ marginTop: 2, width: "auto" }} />
            {t("account.danger.agree")}
          </label>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-ghost btn-sm" onClick={() => setOpen(false)} disabled={busy}>{t("account.danger.cancel")}</button>
            <button className="btn btn-sm" style={{ background: canDelete ? "var(--brick)" : "var(--border)", color: "#fff", cursor: canDelete ? "pointer" : "not-allowed" }} disabled={!canDelete || busy} onClick={del}>
              {busy ? t("account.danger.deleting") : t("account.danger.deleteForever")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
