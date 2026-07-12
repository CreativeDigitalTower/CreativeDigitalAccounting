"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { UiIcon } from "@/components/app/NavIcons";
import { confirmDelete } from "@/lib/confirmDelete";
import { useT } from "@/components/i18n/I18nProvider";

export function SupplierRowActions({ id, name }: { id: string; name: string }) {
  const t = useT();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function del() {
    if (!(await confirmDelete(t("suppliers.confirmDelete", { name })))) return;
    setBusy(true);
    const res = await fetch(`/api/suppliers/${id}`, { method: "DELETE" });
    setBusy(false);
    if (res.ok) router.refresh();
    else alert((await res.json().catch(() => ({}))).error ?? t("suppliers.errDelete"));
  }

  return (
    <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
      <Link href={`/dashboard/suppliers/${id}`} className="btn btn-ghost btn-sm">{t("suppliers.row.dossier")}</Link>
      <Link href={`/dashboard/suppliers/${id}?edit=1`} className="btn btn-ghost btn-sm" title={t("suppliers.row.edit")} style={{ display: "inline-flex", alignItems: "center" }}><UiIcon.edit /></Link>
      <button onClick={del} disabled={busy} className="btn btn-ghost btn-sm" title={t("suppliers.row.delete")} style={{ color: "var(--brick)", borderColor: "var(--brick)", display: "inline-flex", alignItems: "center" }}><UiIcon.trash /></button>
    </div>
  );
}
