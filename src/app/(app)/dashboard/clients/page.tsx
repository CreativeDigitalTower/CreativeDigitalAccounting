import { requireCompany } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { formatCurrency } from "@/lib/constants";

export default async function ClientsPage() {
  const { companyId } = await requireCompany();

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [clients, invoices] = await Promise.all([
    prisma.client.findMany({
      where: { companyId },
      include: { _count: { select: { documents: true, notes: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.document.findMany({
      where: { companyId, type: "invoice", clientId: { not: null } },
      select: { clientId: true, issueDate: true, lines: { select: { lineTotal: true } } },
    }),
  ]);

  // Приходи на база генерираните фактури
  const totalByClient = new Map<string, number>();
  const monthByClient = new Map<string, number>();
  for (const inv of invoices) {
    const sum = inv.lines.reduce((s, l) => s + l.lineTotal, 0);
    totalByClient.set(inv.clientId!, (totalByClient.get(inv.clientId!) ?? 0) + sum);
    if (new Date(inv.issueDate) >= monthStart) {
      monthByClient.set(inv.clientId!, (monthByClient.get(inv.clientId!) ?? 0) + sum);
    }
  }
  const grandTotal = [...totalByClient.values()].reduce((s, v) => s + v, 0);
  const grandMonth = [...monthByClient.values()].reduce((s, v) => s + v, 0);

  const sorted = [...clients].sort((a, b) => (totalByClient.get(b.id) ?? 0) - (totalByClient.get(a.id) ?? 0));

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 25, fontWeight: 600, margin: "0 0 3px" }}>Клиенти</h1>
          <div style={{ color: "var(--muted)", fontSize: 13 }}>{clients.length} клиента</div>
        </div>
        <Link href="/dashboard/clients/new" className="btn btn-primary">+ Нов клиент</Link>
      </div>

      {/* Общо приходи */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
        <div className="glass panel" style={{ padding: "16px 20px" }}>
          <div style={{ fontSize: 12, color: "var(--muted)" }}>Общ приход от всички клиенти (този месец)</div>
          <div className="num" style={{ fontSize: 24, fontWeight: 700, color: "var(--emerald-dark)" }}>{formatCurrency(grandMonth)}</div>
        </div>
        <div className="glass panel" style={{ padding: "16px 20px" }}>
          <div style={{ fontSize: 12, color: "var(--muted)" }}>Общ приход от всички клиенти (общо)</div>
          <div className="num" style={{ fontSize: 24, fontWeight: 700, color: "var(--navy)" }}>{formatCurrency(grandTotal)}</div>
        </div>
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
                <th>Телефон</th>
                <th className="num">Приход (месец)</th>
                <th className="num">Приход (общо)</th>
                <th className="num">Документи</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((client) => (
                <tr key={client.id}>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 30, height: 30, borderRadius: "50%", background: "var(--navy-soft)", color: "var(--navy)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11.5, fontWeight: 700, fontFamily: "'IBM Plex Mono', monospace", flexShrink: 0 }}>
                        {client.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13.5 }}>{client.name}</div>
                        {client.contactPerson && <div style={{ fontSize: 12, color: "var(--muted)" }}>{client.contactPerson}</div>}
                      </div>
                    </div>
                  </td>
                  <td className="num" style={{ color: "var(--muted)", fontSize: 12.5 }}>{client.eik ?? "—"}</td>
                  <td style={{ fontSize: 13 }}>{client.phone ?? "—"}</td>
                  <td className="num" style={{ fontWeight: 600 }}>{formatCurrency(monthByClient.get(client.id) ?? 0)}</td>
                  <td className="num" style={{ fontWeight: 600, color: "var(--emerald-dark)" }}>{formatCurrency(totalByClient.get(client.id) ?? 0)}</td>
                  <td className="num">{client._count.documents}</td>
                  <td style={{ display: "flex", gap: 6 }}>
                    <Link href={`/dashboard/clients/${client.id}`} className="btn btn-ghost btn-sm">Досие</Link>
                    <Link href={`/dashboard/clients/${client.id}?edit=1`} className="btn btn-ghost btn-sm">✎ Редактирай</Link>
                    <Link href={`/dashboard/documents/new?clientId=${client.id}`} className="btn btn-primary btn-sm">+ Фактура</Link>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ borderTop: "2px solid var(--border)", fontWeight: 700 }}>
                <td colSpan={3} style={{ textAlign: "right" }}>Общо:</td>
                <td className="num">{formatCurrency(grandMonth)}</td>
                <td className="num" style={{ color: "var(--emerald-dark)" }}>{formatCurrency(grandTotal)}</td>
                <td colSpan={2}></td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>
      <p style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 10 }}>
        Приходите се изчисляват автоматично на база издадените фактури. Сортирано по общ приход (топ клиенти най-горе).
      </p>
    </>
  );
}
