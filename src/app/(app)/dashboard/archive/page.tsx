import { requireFeature } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { ArchiveManager } from "@/components/app/ArchiveManager";

export default async function ArchivePage() {
  const { companyId } = await requireFeature("archive");
  const docCount = await prisma.document.count({ where: { companyId } });

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 25, fontWeight: 600, margin: "0 0 3px" }}>Документен Архив</h1>
          <div style={{ color: "var(--muted)", fontSize: 13 }}>Съхранявайте сканирани документи, договори и файлове на едно място</div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 20, flexWrap: "wrap" }}>
        <span className="filter-tab active">Архивни файлове</span>
        <Link href="/dashboard/documents" className="filter-tab">Издадени документи ({docCount})</Link>
        <Link href="/dashboard/documents/protocols" className="filter-tab">Протоколи (ППП)</Link>
      </div>

      <ArchiveManager />
    </>
  );
}
