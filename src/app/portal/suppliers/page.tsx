import { requireEmployee } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { parseEmployeeAccess } from "@/lib/employeeAccess";
import { getT } from "@/lib/i18n/server";

export default async function PortalSuppliersPage() {
  const { employee, companyId } = await requireEmployee();
  if (!parseEmployeeAccess(employee.company.employeeAccess).suppliers) redirect("/portal");
  const { t } = await getT();

  // МАСКИРАНИ данни: само име и град — без цени, рейтинги и финансови условия.
  const suppliers = await prisma.supplier.findMany({
    where: { companyId },
    select: { id: true, name: true, city: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="glass panel">
      <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 20, fontWeight: 700, margin: "0 0 4px" }}>{t("portal.suppliers.title")}</h1>
      <p style={{ fontSize: 12, color: "var(--muted)", margin: "0 0 14px" }}>{t("portal.suppliers.subtitle")}</p>
      {suppliers.length === 0 ? <div style={{ fontSize: 13, color: "var(--muted)" }}>{t("portal.suppliers.empty")}</div> : (
        <table>
          <thead><tr><th>{t("portal.suppliers.th.supplier")}</th><th>{t("portal.suppliers.th.city")}</th></tr></thead>
          <tbody>
            {suppliers.map((s) => (
              <tr key={s.id}><td style={{ fontWeight: 600 }}>{s.name}</td><td style={{ fontSize: 13 }}>{s.city ?? "—"}</td></tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
