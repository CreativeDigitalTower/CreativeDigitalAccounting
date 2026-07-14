import { requireEmployee } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { parseEmployeeAccess } from "@/lib/employeeAccess";
import { STATUSES } from "@/lib/crm";
import { getT } from "@/lib/i18n/server";

export default async function PortalClientsPage() {
  const { employee, companyId } = await requireEmployee();
  if (!parseEmployeeAccess(employee.company.employeeAccess).clients) redirect("/portal");
  const { t } = await getT();

  // МАСКИРАНИ данни: само име, град и статус — без финанси, телефони, имейли и контакти.
  const clients = await prisma.client.findMany({
    where: { companyId },
    select: { id: true, name: true, city: true, status: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="glass panel">
      <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 20, fontWeight: 700, margin: "0 0 4px" }}>{t("portal.clients.title")}</h1>
      <p style={{ fontSize: 12, color: "var(--muted)", margin: "0 0 14px" }}>{t("portal.clients.subtitle")}</p>
      {clients.length === 0 ? <div style={{ fontSize: 13, color: "var(--muted)" }}>{t("portal.clients.empty")}</div> : (
        <table>
          <thead><tr><th>{t("portal.clients.th.client")}</th><th>{t("portal.clients.th.city")}</th><th>{t("portal.clients.th.status")}</th></tr></thead>
          <tbody>
            {clients.map((c) => {
              const s = STATUSES.find((x) => x.id === c.status);
              return (
                <tr key={c.id}>
                  <td style={{ fontWeight: 600 }}>{c.name}</td>
                  <td style={{ fontSize: 13 }}>{c.city ?? "—"}</td>
                  <td>{s ? <span style={{ fontSize: 11, fontWeight: 700, color: "#fff", background: s.color, borderRadius: 14, padding: "2px 9px" }}>{t(`clients.status.${s.id}`)}</span> : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
