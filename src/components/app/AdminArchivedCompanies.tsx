"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { confirmDelete } from "@/lib/confirmDelete";
import { useT } from "@/components/i18n/I18nProvider";

type Archived = { id: string; name: string; eik: string | null; plan: string; owner: string; archivedAt: string };

export function AdminArchivedCompanies({ companies }: { companies: Archived[] }) {
  const t = useT();
  const planLabel = (id: string) => { const l = t(`admin.plan.${id}`); return l.startsWith("admin.") ? id : l; };
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  async function restore(c: Archived) {
    setBusy(c.id);
    const r = await fetch(`/api/admin/company/${c.id}`, { method: "PATCH" });
    setBusy(null);
    if (r.ok) router.refresh();
  }
  async function purge(c: Archived) {
    if (!(await confirmDelete(t("admintools.archived.confirmPurge", { name: c.name })))) return;
    setBusy(c.id);
    const r = await fetch(`/api/admin/company/${c.id}?permanent=1`, {
      method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ comment: t("admintools.archived.purgeComment") }),
    });
    setBusy(null);
    if (r.ok) router.refresh();
  }

  return (
    <div style={{ marginTop: 22 }}>
      <button onClick={() => setOpen((v) => !v)} className="glass panel" style={{ width: "100%", textAlign: "left", cursor: "pointer", border: "none", padding: "12px 16px", display: "flex", alignItems: "center", gap: 10, fontSize: 14, fontWeight: 700, fontFamily: "'Fraunces', serif" }}>
        <span style={{ color: "var(--muted)" }}>{open ? "▼" : "▶"}</span>
        {t("admintools.archived.title", { n: companies.length })}
        <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--muted)", fontWeight: 400 }}>{open ? t("admintools.archived.hide") : t("admintools.archived.show")}</span>
      </button>
      {open && (
        <div className="glass panel" style={{ padding: "8px 0", marginTop: 8 }}>
          {companies.length === 0 ? (
            <div style={{ padding: "20px 16px", fontSize: 13, color: "var(--muted)", textAlign: "center" }}>{t("admintools.archived.empty")}</div>
          ) : (
            <table>
              <thead><tr><th>{t("admintools.archived.thCompany")}</th><th>{t("admintools.archived.thEik")}</th><th>{t("admintools.archived.thOwner")}</th><th>{t("admintools.archived.thPlan")}</th><th>{t("admintools.archived.thArchivedAt")}</th><th></th></tr></thead>
              <tbody>
                {companies.map((c) => (
                  <tr key={c.id} style={{ opacity: 0.85 }}>
                    <td style={{ fontWeight: 600 }}>{c.name}</td>
                    <td className="num" style={{ fontSize: 12.5, color: "var(--muted)" }}>{c.eik ?? "—"}</td>
                    <td style={{ fontSize: 12.5 }}>{c.owner}</td>
                    <td style={{ fontSize: 12.5 }}>{planLabel(c.plan)}</td>
                    <td style={{ fontSize: 12.5, color: "var(--muted)" }}>{c.archivedAt}</td>
                    <td style={{ display: "flex", gap: 6 }}>
                      <button className="btn btn-ghost btn-sm" disabled={busy === c.id} onClick={() => restore(c)}>{t("admintools.archived.restore")}</button>
                      <button className="btn btn-ghost btn-sm" disabled={busy === c.id} onClick={() => purge(c)} style={{ color: "var(--brick)", borderColor: "var(--brick)" }}>{t("admintools.archived.purge")}</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
