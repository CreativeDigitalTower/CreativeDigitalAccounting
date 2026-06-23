import { requireFeature } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { formatCurrency } from "@/lib/constants";

const MTYPE: Record<string, string> = { receive: "Заприходяване", issue: "Изписване", production: "Производство", transfer: "Трансфер" };

export default async function StockItemDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { companyId } = await requireFeature("warehouse");
  const { id } = await params;
  const item = await prisma.stockItem.findFirst({
    where: { id, companyId },
    include: { warehouse: true, movements: { orderBy: { date: "desc" }, include: { supplier: true } } },
  });
  if (!item) notFound();

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20, flexWrap: "wrap" }}>
        <Link href="/dashboard/warehouse" style={{ color: "var(--muted)", textDecoration: "none", fontSize: 13 }}>← Склад</Link>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 600, margin: 0 }}>{item.name}</h1>
        <Link href="/dashboard/warehouse/receive" className="btn btn-ghost btn-sm" style={{ marginLeft: "auto" }}>+ Заприходяване</Link>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px,1fr))", gap: 14, marginBottom: 18 }}>
        {[
          { l: "Наличност", v: `${item.quantity} ${item.unit}` },
          { l: "Мин. наличност", v: item.minQuantity ?? "—" },
          { l: "Склад", v: item.warehouse.name },
          { l: "SKU", v: item.sku ?? "—" },
          { l: "Ед. цена", v: item.unitCost != null ? formatCurrency(item.unitCost) : "—" },
        ].map((k) => (
          <div key={k.l} className="glass kpi-card">
            <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 6 }}>{k.l}</div>
            <div className="num" style={{ fontSize: 16, fontWeight: 600 }}>{k.v}</div>
          </div>
        ))}
      </div>

      <div className="glass panel" style={{ padding: "8px 0" }}>
        <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 15, margin: "12px 16px" }}>Движения ({item.movements.length})</h3>
        {item.movements.length === 0 ? (
          <div style={{ padding: "8px 16px 16px", color: "var(--muted)", fontSize: 13 }}>Няма движения.</div>
        ) : (
          <table>
            <thead><tr><th style={{ paddingLeft: 16 }}>Тип</th><th>Дата</th><th className="num">Кол.</th><th>Доставчик</th></tr></thead>
            <tbody>
              {item.movements.map((m) => (
                <tr key={m.id}>
                  <td style={{ paddingLeft: 16 }}>{MTYPE[m.type] ?? m.type}</td>
                  <td style={{ fontSize: 13, color: "var(--ink-soft)" }}>{new Date(m.date).toLocaleDateString("bg-BG")}</td>
                  <td className="num">{m.quantity}</td>
                  <td style={{ fontSize: 13 }}>{m.supplier?.name ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
