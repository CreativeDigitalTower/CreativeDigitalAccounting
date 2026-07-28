"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/components/i18n/I18nProvider";

/** „Изтрий" = преместване в Кошчето (меко). След това пренасочва към списъка с
 *  документи с параметър, който показва toast „Отмени" (виж TrashToast). */
export function TrashDeleteButton({ id, number, iconOnly = false, redirectTo = "/dashboard/documents" }: {
  id: string; number?: string; iconOnly?: boolean; redirectTo?: string;
}) {
  const t = useT();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function del(e: React.MouseEvent) {
    e.preventDefault(); e.stopPropagation();
    setBusy(true);
    const res = await fetch(`/api/documents/${id}`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: "{}" });
    setBusy(false);
    if (res.ok) {
      const q = new URLSearchParams({ trashed: id, n: number ?? "" });
      router.push(`${redirectTo}?${q.toString()}`);
      router.refresh();
    }
  }

  const icon = (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6"/>
    </svg>
  );

  return (
    <button type="button" onClick={del} disabled={busy} className="btn btn-ghost btn-sm"
      title={t("documents.trash.deleteTitle")} style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "var(--brick)" }}>
      {icon}{!iconOnly && t("documents.trash.delete")}
    </button>
  );
}
