"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { DOC_STATUSES } from "@/lib/constants";

export function DocumentActions({ id, status }: { id: string; status: string }) {
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

  function downloadPdf() {
    document.body.classList.add("printing-doc");
    window.print();
    setTimeout(() => document.body.classList.remove("printing-doc"), 500);
  }

  return (
    <div className="no-print" style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ fontSize: 12, color: "var(--muted)" }}>Статус:</span>
        <select
          value={current}
          onChange={(e) => changeStatus(e.target.value)}
          disabled={saving}
          style={{ width: "auto", padding: "6px 10px", fontSize: 12.5 }}
        >
          {DOC_STATUSES.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </div>
      <Link href={`/dashboard/documents/${id}/edit`} className="btn btn-ghost btn-sm">✎ Редактирай</Link>
      <button onClick={downloadPdf} className="btn btn-primary btn-sm">↓ Изтегли PDF</button>
    </div>
  );
}
