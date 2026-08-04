"use client";

import { useState } from "react";

// Малък бутон „Отвори фирмата" — превключва активната фирма и отваря таблото.
export function OverviewEnter({ companyId, label }: { companyId: string; label: string }) {
  const [busy, setBusy] = useState(false);
  async function open() {
    setBusy(true);
    const res = await fetch("/api/company/switch", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ companyId }) });
    if (res.ok) window.location.href = "/dashboard";
    else setBusy(false);
  }
  return <button className="btn btn-ghost btn-sm" onClick={open} disabled={busy}>{busy ? "…" : label}</button>;
}
