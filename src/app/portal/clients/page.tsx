import { requireEmployee } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { parseEmployeeAccess } from "@/lib/employeeAccess";
import { STATUSES } from "@/lib/crm";

export default async function PortalClientsPage() {
  const { employee, companyId } = await requireEmployee();
  if (!parseEmployeeAccess(employee.company.employeeAccess).clients) redirect("/portal");

  // МАСКИРАНИ данни: само име, град и статус — без финанси, телефони, имейли и контакти.
  const clients = await prisma.client.findMany({
    where: { companyId },
    select: { id: true, name: true, city: true, status: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="glass panel">
      <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 20, fontWeight: 700, margin: "0 0 4px" }}>Клиенти</h1>
      <p style={{ fontSize: 12, color: "var(--muted)", margin: "0 0 14px" }}>Списък само за преглед. Финансовите данни и контактите на клиентите не са видими.</p>
      {clients.length === 0 ? <div style={{ fontSize: 13, color: "var(--muted)" }}>Няма клиенти.</div> : (
        <table>
          <thead><tr><th>Клиент</th><th>Град</th><th>Статус</th></tr></thead>
          <tbody>
            {clients.map((c) => {
              const s = STATUSES.find((x) => x.id === c.status);
              return (
                <tr key={c.id}>
                  <td style={{ fontWeight: 600 }}>{c.name}</td>
                  <td style={{ fontSize: 13 }}>{c.city ?? "—"}</td>
                  <td>{s ? <span style={{ fontSize: 11, fontWeight: 700, color: "#fff", background: s.color, borderRadius: 14, padding: "2px 9px" }}>{s.label}</span> : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
