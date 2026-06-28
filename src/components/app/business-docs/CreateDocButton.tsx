"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function CreateDocButton({ templateId }: { templateId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function create() {
    setBusy(true); setError("");
    const res = await fetch("/api/business-docs", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ templateId }),
    });
    if (res.ok) {
      const { id } = await res.json();
      router.push(`/dashboard/business-docs/doc/${id}`);
    } else { setBusy(false); setError((await res.json()).error ?? "Грешка при създаване."); }
  }

  return (
    <div>
      {error && <div style={{ background: "var(--brick-soft)", color: "var(--brick)", borderRadius: 8, padding: "8px 12px", fontSize: 13, marginBottom: 10 }}>{error}</div>}
      <button onClick={create} disabled={busy} className="btn btn-primary" style={{ fontSize: 15, padding: "12px 30px" }}>
        {busy ? "Създаване…" : "Създай документ →"}
      </button>
    </div>
  );
}
