import { requireEmployee } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { parseEmployeeAccess } from "@/lib/employeeAccess";

export default async function PortalWarehousePage() {
  const { employee, companyId } = await requireEmployee();
  if (!parseEmployeeAccess(employee.company.employeeAccess).warehouse) redirect("/portal");

  // МАСКИРАНИ данни: артикул, наличност, мерна единица, склад — БЕЗ цени и стойности.
  const items = await prisma.stockItem.findMany({
    where: { companyId },
    select: { id: true, name: true, sku: true, quantity: true, unit: true, minQuantity: true, warehouse: { select: { name: true } } },
    orderBy: { name: "asc" },
  });

  return (
    <div className="glass panel">
      <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 20, fontWeight: 700, margin: "0 0 4px" }}>Склад</h1>
      <p style={{ fontSize: 12, color: "var(--muted)", margin: "0 0 14px" }}>Наличности само за преглед. Цените и стойностите не са видими.</p>
      {items.length === 0 ? <div style={{ fontSize: 13, color: "var(--muted)" }}>Няма артикули.</div> : (
        <table>
          <thead><tr><th>Артикул</th><th>SKU</th><th>Склад</th><th className="num">Наличност</th></tr></thead>
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
