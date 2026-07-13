"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { DOC_STATUSES } from "@/lib/constants";
import { DownloadButtons } from "@/components/app/DownloadButtons";
import { useT } from "@/components/i18n/I18nProvider";

export function DocumentActions({ id, status, number }: { id: string; status: string; number?: string }) {
  const t = useT();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [current, setCurrent] = useState(status);

  async function changeStatus(next: string) {
    setSaving(true);
    setCurrent(next);
    const res = await fetch(`/api/documents/${id}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    setSaving(false);
    if (res.ok) router.refresh();
  }

  return (
    <div className="no-print" style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ fontSize: 12, color: "var(--muted)" }}>{t("documents.actions.statusLabel")}</span>
        <select
          value={current}
          onChange={(e) => changeStatus(e.target.value)}
          disabled={saving}
          style={{ width: "auto", padding: "6px 10px", fontSize: 12.5 }}
        >
          {DOC_STATUSES.map((s) => (
            <option key={s.value} value={s.value}>{t(`documents.status.${s.value}`)}</option>
          ))}
        </select>
      </div>
      <Link href={`/dashboard/documents/${id}/edit`} className="btn btn-ghost btn-sm">{t("documents.actions.edit")}</Link>
      <DownloadButtons filename={number ?? "document"} />
    </div>
  );
}
