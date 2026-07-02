import { requireFeature } from "@/lib/session";
import { prisma } from "@/lib/prisma";

const ACTION_LABELS: Record<string, string> = {
  create: "Създаване",
  update: "Редакция",
  delete: "Изтриване",
  status_change: "Смяна на статус",
  login: "Вход",
  impersonate: "Технически достъп",
};

const ENTITY_LABELS: Record<string, string> = {
  Document: "Документ",
  Client: "Клиент",
  Expense: "Разход",
  Company: "Фирма",
  CashRegister: "Каса",
  Subscription: "Абонамент",
};

export default async function AuditPage() {
  const { companyId } = await requireFeature("audit");

  const logs = await prisma.auditLog.findMany({
    where: { companyId },
    include: { user: { select: { name: true, email: true } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 25, fontWeight: 600, margin: "0 0 3px" }}>Одит лог</h1>
        <div style={{ color: "var(--muted)", fontSize: 13 }}>Кой, кога и какво е променил — последни {logs.length} събития</div>
      </div>

      <div className="glass panel" style={{ padding: "8px 0" }}>
        {logs.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px 0", color: "var(--muted)" }}>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 12, color: "var(--muted)" }}><svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2.5h8l4 4V21a.5.5 0 0 1-.5.5h-11A.5.5 0 0 1 6 21V2.5Z"/><path d="M14 2.5v4h4M9 11h6M9 14.5h6M9 18h3"/></svg></div>
            <div style={{ fontSize: 14 }}>Все още няма записани действия</div>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Дата и час</th>
                <th>Потребител</th>
                <th>Действие</th>
                <th>Обект</th>
                <th>Детайли</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td className="num" style={{ fontSize: 12, color: "var(--ink-soft)" }}>
                    {new Date(log.createdAt).toLocaleString("bg-BG")}
                  </td>
                  <td style={{ fontSize: 13 }}>{log.user?.name ?? log.user?.email ?? "Система"}</td>
                  <td>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "var(--navy)" }}>
                      {ACTION_LABELS[log.action] ?? log.action}
                    </span>
                  </td>
                  <td style={{ fontSize: 13 }}>{ENTITY_LABELS[log.entity] ?? log.entity}</td>
                  <td style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>{log.summary ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
