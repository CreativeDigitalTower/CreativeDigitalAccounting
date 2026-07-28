"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useT } from "@/components/i18n/I18nProvider";

/** Toast долу вдясно след „Изтрий" с „Отмени" (10 сек). Отмяната връща документа
 *  от Кошчето. Чете ?trashed=<id>&n=<number> (зададени от TrashDeleteButton). */
export function TrashToast() {
  const t = useT();
  const router = useRouter();
  const params = useSearchParams();
  const trashedId = params.get("trashed");
  const number = params.get("n") || "";
  const [visible, setVisible] = useState(false);
  const [undone, setUndone] = useState(false);

  useEffect(() => {
    if (!trashedId) return;
    setVisible(true); setUndone(false);
    const timer = setTimeout(() => setVisible(false), 10000);
    return () => clearTimeout(timer);
  }, [trashedId]);

  async function undo() {
    if (!trashedId) return;
    await fetch(`/api/documents/${trashedId}/restore`, { method: "POST" });
    setUndone(true); setVisible(false);
    router.replace("/dashboard/documents");
    router.refresh();
  }

  if (!visible || undone || !trashedId) return null;

  return (
    <div style={{ position: "fixed", bottom: 20, right: 20, zIndex: 200, background: "var(--ink)", color: "#fff", borderRadius: 10, padding: "12px 16px", display: "flex", alignItems: "center", gap: 16, boxShadow: "0 10px 30px rgba(0,0,0,.25)", maxWidth: "calc(100vw - 40px)" }}>
      <span style={{ fontSize: 13 }}>{t("documents.trash.toastMoved")}{number ? ` (${number})` : ""}</span>
      <button onClick={undo} style={{ background: "none", border: "none", color: "var(--brass)", fontWeight: 700, fontSize: 13, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4 }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 14 4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 5 5v3"/></svg>
        {t("documents.trash.undo")}
      </button>
    </div>
  );
}
