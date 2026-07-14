import { requireEmployee } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { parseEmployeeAccess } from "@/lib/employeeAccess";
import { getT } from "@/lib/i18n/server";

export default async function PortalWarehousePage() {
  const { employee, companyId } = await requireEmployee();
  if (!parseEmployeeAccess(employee.company.employeeAccess).warehouse) redirect("/portal");
  const { t } = await getT();

  // МАСКИРАНИ данни: артикул, наличност, мерна единица, склад — БЕЗ цени и стойности.
  const items = await prisma.stockItem.findMany({
    where: { companyId },
    select: { id: true, name: true, sku: true, quantity: true, unit: true, minQuantity: true, warehouse: { select: { name: true } } },
    orderBy: { name: "asc" },
  });

  return (
    <div className="glass panel">
      <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 20, fontWeight: 700, margin: "0 0 4px" }}>{t("portal.warehouse.title")}</h1>
      <p style={{ fontSize: 12, color: "var(--muted)", margin: "0 0 14px" }}>{t("portal.warehouse.subtitle")}</p>
      {items.length === 0 ? <div style={{ fontSize: 13, color: "var(--muted)" }}>{t("portal.warehouse.empty")}</div> : (
        <table>
          <thead><tr><th>{t("portal.warehouse.th.item")}</th><th>{t("portal.warehouse.th.sku")}</th><th>{t("portal.warehouse.th.warehouse")}</th><th className="num">{t("portal.warehouse.th.qty")}</th></tr></thead>
          <tbody>
            {items.map((i) => {
              const low = i.minQuantity != null && i.quantity <= i.minQuantity;
              return (
                <tr key={i.id}>
                  <td style={{ fontWeight: 600 }}>{i.name}</td>
                  <td style={{ fontSize: 12.5, color: "var(--muted)" }}>{i.sku ?? "—"}</td>
                  <td style={{ fontSize: 13 }}>{i.warehouse.name}</td>
                  <td className="num" style={{ fontWeight: 600, color: low ? "var(--brick)" : undefined }}>{i.quantity} {i.unit}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
