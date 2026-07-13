import { requireFeature } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { ArchiveManager } from "@/components/app/ArchiveManager";
import { getT } from "@/lib/i18n/server";

export default async function ArchivePage() {
  const { companyId } = await requireFeature("archive");
  const { t } = await getT();
  const docCount = await prisma.document.count({ where: { companyId } });

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 25, fontWeight: 600, margin: "0 0 3px" }}>{t("modules.archive.title")}</h1>
          <div style={{ color: "var(--muted)", fontSize: 13 }}>{t("modules.archive.subtitle")}</div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 20, flexWrap: "wrap" }}>
        <span className="filter-tab active">{t("modules.archive.tabs.archive")}</span>
        <Link href="/dashboard/documents" className="filter-tab">{t("modules.archive.tabs.issued", { n: docCount })}</Link>
        <Link href="/dashboard/documents/protocols" className="filter-tab">{t("modules.archive.tabs.protocols")}</Link>
      </div>

      <ArchiveManager />
    </>
  );
}
