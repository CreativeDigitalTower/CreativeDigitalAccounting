import { requireSuperAdmin } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { getT } from "@/lib/i18n/server";
import { AdminDeletedDocs, type AdminTrashRow } from "@/components/app/AdminDeletedDocs";

export const dynamic = "force-dynamic";

export default async function AdminDeletedDocumentsPage() {
  await requireSuperAdmin();
  const { t } = await getT();

  const docs = await prisma.document.findMany({
    where: { deletedAt: { not: null } },
    include: { company: { select: { name: true } }, client: { select: { name: true } } },
    orderBy: { deletedAt: "desc" },
    take: 1000,
  });

  const userIds = [...new Set(docs.map((d) => d.deletedById).filter(Boolean) as string[])];
  const users = userIds.length ? await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true, email: true } }) : [];
  const nameOf = (id: string | null) => { if (!id) return null; const u = users.find((x) => x.id === id); return u?.name || u?.email || null; };

  const rows: AdminTrashRow[] = docs.map((d) => ({
    id: d.id, number: d.number, type: d.type, companyName: d.company?.name ?? "—", clientName: d.client?.name ?? null,
    deletedAt: d.deletedAt!.toISOString(), deletedByName: nameOf(d.deletedById), reason: d.deleteReason, status: d.status,
  }));

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 8, flexWrap: "wrap" }}>
        <Link href="/dashboard/admin" style={{ color: "var(--muted)", textDecoration: "none", fontSize: 13 }}>{t("admin.deletedDocs.back")}</Link>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 25, fontWeight: 600, margin: 0 }}>{t("admin.deletedDocs.title")}</h1>
      </div>
      <div style={{ color: "var(--muted)", fontSize: 13, marginBottom: 18 }}>{t("admin.deletedDocs.subtitle", { n: rows.length })}</div>
      <AdminDeletedDocs rows={rows} />
    </>
  );
}
