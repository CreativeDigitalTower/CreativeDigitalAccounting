"use client";
import { useState } from "react";
import { useT } from "@/components/i18n/I18nProvider";

export type PurgeMode = "single" | "bulk" | "empty";

/**
 * Confirmation за ОКОНЧАТЕЛНО изтриване от Кошчето (§3/§4/§5). Destructive styling, без
 * browser confirm(). Изпраща към /permanent-delete (единично / bulk / Изпразни кошчето).
 */
export function ExportPurgeModal({ mode, count, ids, onClose, onDone }: {
  mode: PurgeMode; count: number; ids?: string[]; onClose: () => void; onDone: (deleted: number) => void;
}) {
  const t = useT();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const title = mode === "empty" ? t("logistics.purge.emptyTitle") : t("logistics.purge.title");
  const body = mode === "single" ? t("logistics.purge.bodySingle")
    : mode === "bulk" ? t("logistics.purge.bodyBulk", { n: count })
    : t("logistics.purge.bodyEmpty", { n: count });
  const confirmLabel = mode === "empty" ? t("logistics.purge.confirmEmpty") : t("logistics.purge.confirm");

  async function run() {
    setBusy(true); setErr("");
    try {
      const payload = mode === "empty" ? { emptyTrash: true } : { ids: ids ?? [] };
      const r = await fetch("/api/logistics/export-sets/permanent-delete", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) { setErr(j.error ?? t("logistics.common.err")); setBusy(false); return; }
      onDone(j.deleted ?? 0);
    } catch {
      setErr(t("logistics.common.err")); setBusy(false);
    }
  }

  return (
    <div onClick={busy ? undefined : onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()} className="glass panel" style={{ width: 460, maxWidth: "100%", padding: 22, borderRadius: 14, borderTop: "4px solid var(--brick)" }}>
        <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 17, margin: "0 0 10px", color: "var(--brick)" }}>{title}</h3>
        <p style={{ fontSize: 13.5, color: "var(--ink-soft)", lineHeight: 1.5, margin: "0 0 8px" }}>{body}</p>
        <p style={{ fontSize: 12.5, color: "var(--muted)", margin: "0 0 16px" }}>{t("logistics.purge.irreversible")}</p>
        {err && <div style={{ fontSize: 12.5, color: "var(--brick)", marginBottom: 10 }}>{err}</div>}
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button className="btn btn-ghost btn-sm" disabled={busy} onClick={onClose}>{t("logistics.common.cancel")}</button>
          <button className="btn btn-sm" disabled={busy} onClick={run} style={{ background: "var(--brick)", color: "#fff", border: "none" }}>{busy ? t("logistics.purge.deleting") : confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}
