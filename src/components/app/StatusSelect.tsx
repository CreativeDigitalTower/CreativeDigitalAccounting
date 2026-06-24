"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DOC_STATUSES } from "@/lib/constants";

export function StatusSelect({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const [current, setCurrent] = useState(status);
  const [saving, setSaving] = useState(false);

  async function change(next: string) {
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
    <select
      value={current}
      onChange={(e) => change(e.target.value)}
      disabled={saving}
      onClick={(e) => e.stopPropagation()}
      style={{ width: "auto", padding: "4px 8px", fontSize: 12, borderRadius: 6 }}
      title="Смени статус"
    >
      {DOC_STATUSES.map((s) => (
        <option key={s.value} value={s.value}>{s.label}</option>
      ))}
    </select>
  );
}
