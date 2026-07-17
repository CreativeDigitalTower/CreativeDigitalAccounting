import { requireFeature } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { formatCurrency } from "@/lib/constants";
import { StockItemActions } from "@/components/app/StockItemActions";
import { getT } from "@/lib/i18n/server";

export default async function StockItemDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { companyId } = await requireFeature("warehouse");
  const { t, locale } = await getT();
  const { id } = await params;
  const item = await prisma.stockItem.findFirst({
    where: { id, companyId },
    include: { warehouse: true, movements: { orderBy: { date: "desc" }, include: { supplier: true } } },
  });
  if (!item) notFound();

  const categories = await prisma.stockCategory.findMany({ where: { companyId }, orderBy: { name: "asc" }, select: { id: true, name: true } });

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20, flexWrap: "wrap" }}>
        <Link href="/dashboard/warehouse" style={{ color: "var(--muted)", textDecoration: "none", fontSize: 13 }}>{t("warehouse.common.back")}</Link>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 600, margin: 0 }}>{item.name}</h1>
        <StockItemActions item={{ id: item.id, name: item.name, sku: item.sku, unit: item.unit, quantity: item.quantity, minQuantity: item.minQuantity, unitCost: item.unitCost, expiryDate: item.expiryDate ? item.expiryDate.toISOString() : null, categoryId: item.categoryId }} categories={categories} />
        <Link href="/dashboard/warehouse/receive" className="btn btn-ghost btn-sm">{t("warehouse.itemDetail.receiveBtn")}</Link>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px,1fr))", gap: 14, marginBottom: 18 }}>
        {[
          { l: t("warehouse.itemDetail.kpi.qty"), v: `${item.quantity} ${item.unit}` },
          { l: t("warehouse.itemDetail.kpi.minQty"), v: item.minQuantity ?? "—" },
          { l: t("warehouse.itemDetail.kpi.warehouse"), v: item.warehouse.name },
          { l: t("warehouse.itemDetail.kpi.sku"), v: item.sku ?? "—" },
          { l: t("warehouse.itemDetail.kpi.price"), v: item.unitCost != null ? formatCurrency(item.unitCost) : "—" },
        ].map((k) => (
          <div key={k.l} className="glass kpi-card">
            <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 6 }}>{k.l}</div>
            <div className="num" style={{ fontSize: 16, fontWeight: 600 }}>{k.v}</div>
          </div>
        ))}
      </div>

      <div className="glass panel" style={{ padding: "8px 0" }}>
        <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 15, margin: "12px 16px" }}>{t("warehouse.itemDetail.movements", { n: item.movements.length })}</h3>
        {item.movements.length === 0 ? (
          <div style={{ padding: "8px 16px 16px", color: "var(--muted)", fontSize: 13 }}>{t("warehouse.itemDetail.noMovements")}</div>
        ) : (
          <table>
            <thead><tr><th style={{ paddingLeft: 16 }}>{t("warehouse.itemDetail.th.type")}</th><th>{t("warehouse.itemDetail.th.date")}</th><th className="num">{t("warehouse.itemDetail.th.qty")}</th><th>{t("warehouse.itemDetail.th.supplier")}</th></tr></thead>
            <tbody>
              {item.movements.map((m) => (
                <tr key={m.id}>
                  <td style={{ paddingLeft: 16 }}>{(() => { const l = t(`warehouse.itemDetail.mtype.${m.type}`); return l === `warehouse.itemDetail.mtype.${m.type}` ? m.type : l; })()}</td>
                  <td style={{ fontSize: 13, color: "var(--ink-soft)" }}>{new Date(m.date).toLocaleDateString(locale)}</td>
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
