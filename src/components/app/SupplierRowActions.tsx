"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { UiIcon } from "@/components/app/NavIcons";
import { confirmDelete } from "@/lib/confirmDelete";

export function SupplierRowActions({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function del() {
    if (!(await confirmDelete(`доставчика „${name}"`))) return;
    setBusy(true);
    const res = await fetch(`/api/suppliers/${id}`, { method: "DELETE" });
    setBusy(false);
    if (res.ok) router.refresh();
    else alert((await res.json().catch(() => ({}))).error ?? "Грешка при изтриване.");
  }

  return (
    <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
      <Link href={`/dashboard/suppliers/${id}`} className="btn btn-ghost btn-sm">Досие</Link>
      <Link href={`/dashboard/suppliers/${id}?edit=1`} className="btn btn-ghost btn-sm" title="Редактирай" style={{ display: "inline-flex", alignItems: "center" }}><UiIcon.edit /></Link>
      <button onClick={del} disabled={busy} className="btn btn-ghost btn-sm" title="Изтрий доставчик" style={{ color: "var(--brick)", borderColor: "var(--brick)", display: "inline-flex", alignItems: "center" }}><UiIcon.trash /></button>
    </div>
  );
}
