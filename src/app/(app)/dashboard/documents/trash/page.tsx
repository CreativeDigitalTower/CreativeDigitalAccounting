import { requireCompany, getMyRole } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { getT } from "@/lib/i18n/server";
import { TRASH_RETENTION_DAYS } from "@/lib/constants";
import { TrashList, type TrashRow } from "@/components/app/TrashList";

export const dynamic = "force-dynamic";

export default async function TrashPage() {
  const { companyId, userId } = await requireCompany();
  const { t } = await getT();
  const role = await getMyRole(userId, companyId);

  const docs = await prisma.document.findMany({
    where: { companyId, deletedAt: { not: null } },
    include: { client: { select: { name: true } } },
    orderBy: { deletedAt: "desc" },
  });

  // Имена на потребителите, извършили изтриването
  const userIds = [...new Set(docs.map((d) => d.deletedById).filter(Boolean) as string[])];
  const users = userIds.length ? await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true, email: true } }) : [];
  const nameOf = (id: string | null) => { if (!id) return null; const u = users.find((x) => x.id === id); return u?.name || u?.email || null; };

  const now = Date.now();
  const daysLeft = (deletedAt: Date) => Math.max(0, TRASH_RETENTION_DAYS - Math.floor((now - new Date(deletedAt).getTime()) / 86400000));

  const rows: TrashRow[] = docs.map((d) => ({
    id: d.id, number: d.number, type: d.type, clientName: d.client?.name ?? null,
    issueDate: d.issueDate.toISOString(), deletedAt: d.deletedAt!.toISOString(),
    deletedByName: nameOf(d.deletedById), reason: d.deleteReason, status: d.status,
    autoDeleteDays: daysLeft(d.deletedAt!),
  }));

  const oldestDays = rows.length ? Math.min(...rows.map((r) => r.autoDeleteDays)) : null;

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 8, flexWrap: "wrap" }}>
        <Link href="/dashboard/documents" style={{ color: "var(--muted)", textDecoration: "none", fontSize: 13 }}>{t("documents.trash.back")}</Link>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 25, fontWeight: 600, margin: 0 }}>{t("documents.trash.title")}</h1>
      </div>
      <div style={{ color: "var(--muted)", fontSize: 13, marginBottom: 18 }}>
        {t("documents.trash.count", { n: rows.length })}
        {oldestDays != null && <> · {t("documents.trash.oldest", { days: oldestDays })}</>}
      </div>

      <TrashList rows={rows} canPermanent={role === "owner"} />
    </>
  );
}
