import { requireEmployee } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { parseEmployeeAccess } from "@/lib/employeeAccess";

const STATUS_LABEL: Record<string, string> = { active: "Активен", on_hold: "На пауза", done: "Завършен", cancelled: "Отказан" };

export default async function PortalProjectsPage() {
  const { employee, companyId } = await requireEmployee();
  if (!parseEmployeeAccess(employee.company.employeeAccess).projects) redirect("/portal");

  // МАСКИРАНИ данни: име, статус, срок — без стойности, приходи и клиентски финанси.
  const projects = await prisma.project.findMany({
    where: { companyId },
    select: { id: true, name: true, status: true, deadline: true, client: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="glass panel">
      <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 20, fontWeight: 700, margin: "0 0 4px" }}>Проекти</h1>
      <p style={{ fontSize: 12, color: "var(--muted)", margin: "0 0 14px" }}>Списък само за преглед. Стойностите и финансовите данни не са видими.</p>
      {projects.length === 0 ? <div style={{ fontSize: 13, color: "var(--muted)" }}>Няма проекти.</div> : (
        <table>
          <thead><tr><th>Проект</th><th>Клиент</th><th>Статус</th><th>Краен срок</th></tr></thead>
          <tbody>
            {projects.map((p) => (
              <tr key={p.id}>
                <td style={{ fontWeight: 600 }}>{p.name}</td>
                <td style={{ fontSize: 13 }}>{p.client?.name ?? "—"}</td>
                <td style={{ fontSize: 13 }}>{STATUS_LABEL[p.status] ?? p.status}</td>
                <td style={{ fontSize: 13 }}>{p.deadline ? new Date(p.deadline).toLocaleDateString("bg-BG") : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
