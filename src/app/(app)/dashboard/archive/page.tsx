import { requireCompany } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export default async function ArchivePage() {
  const { companyId } = await requireCompany();

  const [protocols, docCount] = await Promise.all([
    prisma.handoverProtocol.findMany({
      where: { companyId },
      orderBy: { date: "desc" },
    }),
    prisma.document.count({ where: { companyId } }),
  ]);

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 25, fontWeight: 600, margin: "0 0 3px" }}>Документен Архив</h1>
          <div style={{ color: "var(--muted)", fontSize: 13 }}>{docCount} документа · {protocols.length} протокола</div>
        </div>
        <Link href="/dashboard/archive/protocols/new" className="btn btn-primary">+ Нов ППП</Link>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
        <Link href="/dashboard/documents" className="filter-tab">Всички документи</Link>
        <span className="filter-tab active">Протоколи (ППП)</span>
      </div>

      <div className="glass panel" style={{ padding: "8px 0" }}>
        <div style={{ padding: "12px 16px 8px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 15, margin: 0 }}>Приемо-предавателни протоколи</h3>
        </div>

        {protocols.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px 0", color: "var(--muted)" }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🗂️</div>
            <div style={{ fontSize: 14, marginBottom: 16 }}>Няма протоколи</div>
            <Link href="/dashboard/archive/protocols/new" className="btn btn-primary btn-sm">Създай ППП</Link>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Номер</th>
                <th>Дата</th>
                <th>Описание</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {protocols.map((p) => (
                <tr key={p.id}>
                  <td className="num" style={{ color: "var(--muted)", fontSize: 12 }}>{p.number}</td>
                  <td style={{ color: "var(--ink-soft)", fontSize: 13 }}>
                    {new Date(p.date).toLocaleDateString("bg-BG")}
                  </td>
                  <td style={{ fontSize: 13 }}>{p.description ?? "—"}</td>
                  <td>
                    <Link href={`/dashboard/archive/protocols/${p.id}`} className="btn btn-ghost btn-sm">Преглед</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
