import { requireCompany } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export default async function ClientsPage() {
  const { companyId } = await requireCompany();

  const clients = await prisma.client.findMany({
    where: { companyId },
    include: {
      _count: { select: { documents: true, notes: true } },
    },
    orderBy: { name: "asc" },
  });

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 25, fontWeight: 600, margin: "0 0 3px" }}>Клиенти</h1>
          <div style={{ color: "var(--muted)", fontSize: 13 }}>{clients.length} клиента</div>
        </div>
        <Link href="/dashboard/clients/new" className="btn btn-primary">+ Нов клиент</Link>
      </div>

      <div className="glass panel" style={{ padding: "8px 0" }}>
        {clients.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px 0", color: "var(--muted)" }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>👥</div>
            <div style={{ fontSize: 14, marginBottom: 16 }}>Няма клиенти</div>
            <Link href="/dashboard/clients/new" className="btn btn-primary btn-sm">Добави клиент</Link>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Клиент</th>
                <th>ЕИК</th>
                <th>Имейл</th>
                <th>Телефон</th>
                <th className="num">Документи</th>
                <th className="num">Бележки</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {clients.map((client) => (
                <tr key={client.id}>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div
                        style={{
                          width: 30, height: 30, borderRadius: "50%",
                          background: "var(--navy-soft)", color: "var(--navy)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 11.5, fontWeight: 700, fontFamily: "'IBM Plex Mono', monospace", flexShrink: 0,
                        }}
                      >
                        {client.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13.5 }}>{client.name}</div>
                        {client.city && <div style={{ fontSize: 12, color: "var(--muted)" }}>{client.city}</div>}
                      </div>
                    </div>
                  </td>
                  <td className="num" style={{ color: "var(--muted)", fontSize: 12.5 }}>{client.eik ?? "—"}</td>
                  <td style={{ fontSize: 13 }}>{client.contactEmail ?? "—"}</td>
                  <td style={{ fontSize: 13 }}>{client.phone ?? "—"}</td>
                  <td className="num">{client._count.documents}</td>
                  <td className="num">{client._count.notes}</td>
                  <td style={{ display: "flex", gap: 6 }}>
                    <Link href={`/dashboard/clients/${client.id}`} className="btn btn-ghost btn-sm">Досие</Link>
                    <Link href={`/dashboard/documents/new?clientId=${client.id}`} className="btn btn-primary btn-sm">+ Фактура</Link>
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
