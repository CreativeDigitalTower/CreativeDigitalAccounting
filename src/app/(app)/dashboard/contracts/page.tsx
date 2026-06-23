import { requireCompany } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export default async function ContractsPage() {
  const { companyId } = await requireCompany();
  const now = new Date();
  const soon = new Date(now.getTime() + 30 * 24 * 3600 * 1000);

  const contracts = await prisma.contract.findMany({
    where: { companyId },
    include: { client: true, supplier: true },
    orderBy: { startDate: "desc" },
  });

  const statusLabel: Record<string, string> = { active: "Активен", expired: "Изтекъл", cancelled: "Анулиран" };

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 25, fontWeight: 600, margin: "0 0 3px" }}>Договори</h1>
          <div style={{ color: "var(--muted)", fontSize: 13 }}>{contracts.length} договора</div>
        </div>
        <Link href="/dashboard/contracts/new" className="btn btn-primary">+ Нов договор</Link>
      </div>

      <div className="glass panel" style={{ padding: "8px 0" }}>
        {contracts.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px 0", color: "var(--muted)" }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>📑</div>
            <div style={{ fontSize: 14, marginBottom: 16 }}>Няма договори</div>
            <Link href="/dashboard/contracts/new" className="btn btn-primary btn-sm">Добави договор</Link>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Договор</th>
                <th>Страна</th>
                <th>Тип</th>
                <th>Начало</th>
                <th>Край</th>
                <th>Авт. подновяване</th>
                <th>Статус</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {contracts.map((c) => {
                const expiring = c.endDate && c.endDate > now && c.endDate < soon;
                const counterparty = c.counterpartyType === "client" ? c.client?.name : c.supplier?.name;
                return (
                  <tr key={c.id}>
                    <td style={{ fontWeight: 600 }}>{c.title}</td>
                    <td style={{ fontSize: 13 }}>{counterparty ?? "—"}</td>
                    <td>
                      <span style={{ fontSize: 12, fontWeight: 600, color: c.counterpartyType === "client" ? "var(--navy)" : "var(--brass)" }}>
                        {c.counterpartyType === "client" ? "Клиент" : "Доставчик"}
                      </span>
                    </td>
                    <td style={{ color: "var(--ink-soft)", fontSize: 13 }}>
                      {new Date(c.startDate).toLocaleDateString("bg-BG")}
                    </td>
                    <td style={{ fontSize: 13 }}>
                      {c.endDate ? (
                        <span style={{ color: expiring ? "var(--brick)" : "var(--ink-soft)" }}>
                          {expiring && "⚠ "}{new Date(c.endDate).toLocaleDateString("bg-BG")}
                        </span>
                      ) : "—"}
                    </td>
                    <td style={{ textAlign: "center" }}>{c.autoRenew ? "✓" : "—"}</td>
                    <td>
                      <span style={{ fontSize: 12, fontWeight: 600, color: c.status === "active" ? "var(--emerald)" : "var(--muted)" }}>
                        {statusLabel[c.status]}
                      </span>
                    </td>
                    <td>
                      <Link href={`/dashboard/contracts/${c.id}`} className="btn btn-ghost btn-sm">Преглед</Link>
                    </td>
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
