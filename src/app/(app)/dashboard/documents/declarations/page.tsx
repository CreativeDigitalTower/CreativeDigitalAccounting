import { requireFeature } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export default async function DeclarationsPage() {
  const { companyId } = await requireFeature("declarations");
  const decs = await prisma.conformityDeclaration.findMany({ where: { companyId }, orderBy: { date: "desc" } });

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <Link href="/dashboard/documents" style={{ color: "var(--muted)", textDecoration: "none", fontSize: 13 }}>← Документи</Link>
          <div>
            <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 600, margin: "0 0 3px" }}>Декларации за съответствие</h1>
            <div style={{ color: "var(--muted)", fontSize: 13 }}>{decs.length} декларации</div>
          </div>
        </div>
        <Link href="/dashboard/documents/declarations/new" className="btn btn-primary">+ Нова декларация</Link>
      </div>

      <div className="glass panel" style={{ padding: "8px 0" }}>
        {decs.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px 0", color: "var(--muted)" }}>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 12, color: "var(--muted)" }}><svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2.5h8l4 4V21a.5.5 0 0 1-.5.5h-11A.5.5 0 0 1 6 21V2.5Z"/><path d="M14 2.5v4h4M9 12h6M9 15.5h6"/></svg></div>
            <div style={{ fontSize: 14, marginBottom: 16 }}>Няма декларации</div>
            <Link href="/dashboard/documents/declarations/new" className="btn btn-primary btn-sm">Създай декларация</Link>
          </div>
        ) : (
          <table>
            <thead><tr><th>Номер</th><th>Дата</th><th>Клиент</th><th>Продукти</th><th></th></tr></thead>
            <tbody>
              {decs.map((d) => {
                let count = 0;
                try { count = d.products ? JSON.parse(d.products).length : 0; } catch { count = 0; }
                return (
                  <tr key={d.id}>
                    <td className="num" style={{ color: "var(--muted)", fontSize: 12 }}>{d.number}</td>
                    <td style={{ color: "var(--ink-soft)", fontSize: 13 }}>{new Date(d.date).toLocaleDateString("bg-BG")}</td>
                    <td style={{ fontSize: 13, fontWeight: 600 }}>{d.clientName ?? d.productName ?? "—"}</td>
                    <td style={{ fontSize: 13 }}>{count || "—"}</td>
                    <td><Link href={`/dashboard/documents/declarations/${d.id}`} className="btn btn-ghost btn-sm">Преглед</Link></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
