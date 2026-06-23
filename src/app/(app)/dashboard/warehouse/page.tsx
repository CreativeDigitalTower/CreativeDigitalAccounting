import { requireCompany } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export default async function WarehousePage() {
  const { companyId } = await requireCompany();

  const [stockItems, warehouses] = await Promise.all([
    prisma.stockItem.findMany({
      where: { companyId },
      include: { warehouse: true },
      orderBy: { name: "asc" },
    }),
    prisma.warehouse.findMany({
      where: { companyId },
      include: { _count: { select: { stockItems: true } } },
    }),
  ]);

  const lowStock = stockItems.filter((i) => i.minQuantity !== null && i.quantity <= (i.minQuantity ?? 0));

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 25, fontWeight: 600, margin: "0 0 3px" }}>Склад</h1>
          <div style={{ color: "var(--muted)", fontSize: 13 }}>{stockItems.length} артикула в {warehouses.length} склада</div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <Link href="/dashboard/warehouse/receive" className="btn btn-ghost">+ Заприходяване</Link>
          <Link href="/dashboard/warehouse/items/new" className="btn btn-primary">+ Нов артикул</Link>
        </div>
      </div>

      {/* Warehouses overview */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14, marginBottom: 20 }}>
        {warehouses.map((w) => (
          <div key={w.id} className="glass kpi-card">
            <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 6 }}>📦 {w.name}</div>
            <div className="num" style={{ fontSize: 22, fontWeight: 600 }}>{w._count.stockItems}</div>
            <div style={{ fontSize: 12, color: "var(--ink-soft)", marginTop: 2 }}>артикула</div>
          </div>
        ))}
      </div>

      {/* Low stock alert */}
      {lowStock.length > 0 && (
        <div style={{ background: "var(--brick-soft)", border: "1px solid rgba(162,59,43,.3)", borderRadius: 10, padding: "12px 16px", marginBottom: 16, fontSize: 13 }}>
          <strong style={{ color: "var(--brick)" }}>⚠ Ниска наличност ({lowStock.length} артикула):</strong>{" "}
          {lowStock.map((i) => i.name).join(", ")}
        </div>
      )}

      <div className="glass panel" style={{ padding: "8px 0" }}>
        {stockItems.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px 0", color: "var(--muted)" }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>📦</div>
            <div style={{ fontSize: 14, marginBottom: 16 }}>Складът е празен</div>
            <Link href="/dashboard/warehouse/items/new" className="btn btn-primary btn-sm">Добави артикул</Link>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Артикул</th>
                <th>SKU</th>
                <th>Склад</th>
                <th>Ед. мярка</th>
                <th className="num">Наличност</th>
                <th className="num">Мин. наличност</th>
                <th className="num">Ед. цена</th>
                <th>Статус</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {stockItems.map((item) => {
                const isLow = item.minQuantity !== null && item.quantity <= (item.minQuantity ?? 0);
                return (
                  <tr key={item.id}>
                    <td style={{ fontWeight: 600 }}>{item.name}</td>
                    <td className="num" style={{ color: "var(--muted)", fontSize: 12 }}>{item.sku ?? "—"}</td>
                    <td style={{ fontSize: 13 }}>{item.warehouse.name}</td>
                    <td style={{ fontSize: 13 }}>{item.unit}</td>
                    <td className="num" style={{ fontWeight: 600, color: isLow ? "var(--brick)" : "inherit" }}>
                      {item.quantity}
                    </td>
                    <td className="num" style={{ color: "var(--muted)", fontSize: 12.5 }}>
                      {item.minQuantity ?? "—"}
                    </td>
                    <td className="num" style={{ fontSize: 13 }}>
                      {item.unitCost != null ? `${item.unitCost.toFixed(2)} EUR` : "—"}
                    </td>
                    <td>
                      {isLow ? (
                        <span style={{ color: "var(--brick)", fontSize: 12, fontWeight: 600 }}>⚠ Ниска</span>
                      ) : (
                        <span style={{ color: "var(--emerald)", fontSize: 12, fontWeight: 600 }}>✓ Норма</span>
                      )}
                    </td>
                    <td>
                      <Link href={`/dashboard/warehouse/items/${item.id}`} className="btn btn-ghost btn-sm">
                        Детайли
                      </Link>
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
