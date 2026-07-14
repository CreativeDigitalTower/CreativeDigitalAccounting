import { requireEmployee } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { parseEmployeeAccess } from "@/lib/employeeAccess";
import { getT } from "@/lib/i18n/server";

export default async function PortalProjectsPage() {
  const { employee, companyId } = await requireEmployee();
  if (!parseEmployeeAccess(employee.company.employeeAccess).projects) redirect("/portal");
  const { t, locale } = await getT();
  const projStatus = (s: string) => { const l = t(`portal.projects.status.${s}`); return l.startsWith("portal.") ? s : l; };

  // МАСКИРАНИ данни: име, статус, срок — без стойности, приходи и клиентски финанси.
  const projects = await prisma.project.findMany({
    where: { companyId },
    select: { id: true, name: true, status: true, deadline: true, client: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="glass panel">
      <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 20, fontWeight: 700, margin: "0 0 4px" }}>{t("portal.projects.title")}</h1>
      <p style={{ fontSize: 12, color: "var(--muted)", margin: "0 0 14px" }}>{t("portal.projects.subtitle")}</p>
      {projects.length === 0 ? <div style={{ fontSize: 13, color: "var(--muted)" }}>{t("portal.projects.empty")}</div> : (
        <table>
          <thead><tr><th>{t("portal.projects.th.project")}</th><th>{t("portal.projects.th.client")}</th><th>{t("portal.projects.th.status")}</th><th>{t("portal.projects.th.deadline")}</th></tr></thead>
          <tbody>
            {projects.map((p) => (
              <tr key={p.id}>
                <td style={{ fontWeight: 600 }}>{p.name}</td>
                <td style={{ fontSize: 13 }}>{p.client?.name ?? "—"}</td>
                <td style={{ fontSize: 13 }}>{projStatus(p.status)}</td>
                <td style={{ fontSize: 13 }}>{p.deadline ? new Date(p.deadline).toLocaleDateString(locale) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
