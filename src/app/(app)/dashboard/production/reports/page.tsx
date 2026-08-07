import Link from "next/link";
import { requireFeature } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/constants";
import { getT } from "@/lib/i18n/server";
import { summarizeProduction, groupOrders, groupConsumedMaterials, type OrderForReport } from "@/lib/productionReports";
import { ProductionReportTools, type ReportRow } from "@/components/app/ProductionReportTools";

export const dynamic = "force-dynamic";

// Производствени справки — KPI и разбивки (по продукт/оператор/партида/суровина)
// от производствените поръчки, с филтър по период, търсене, export и запазени филтри.
export default async function ProductionReportsPage({ searchParams }: { searchParams: Promise<{ from?: string; to?: string; q?: string }> }) {
  const { companyId } = await requireFeature("production");
  const { t, locale } = await getT();
  const sp = await searchParams;
  const now = new Date();
  const from = sp.from ? new Date(sp.from) : new Date(now.getFullYear(), now.getMonth(), 1);
  const to = sp.to ? new Date(sp.to + "T23:59:59") : now;

  const orderRows = await prisma.productionOrder.findMany({
    where: { companyId, producedAt: { gte: from, lte: to } },
    include: { consumptions: true },
    orderBy: { producedAt: "desc" },
    take: 1000,
  });

  const q = (sp.q ?? "").trim().toLowerCase();
  const filtered = q
    ? orderRows.filter((o) => `${o.number} ${o.outputName} ${o.outputBatch ?? ""} ${o.operatorName ?? ""}`.toLowerCase().includes(q))
    : orderRows;

  const orders: OrderForReport[] = filtered.map((o) => ({
    outputName: o.outputName, outputBatch: o.outputBatch, quantity: o.quantity, unit: o.unit,
    materialsCost: o.materialsCost, unitCost: o.unitCost, operatorName: o.operatorName, status: o.status,
    consumptions: o.consumptions.map((c) => ({ itemName: c.itemName, quantity: c.quantity, unit: c.unit, unitCost: c.unitCost })),
  }));

  const sum = summarizeProduction(orders);
  const byProduct = groupOrders(orders, "product");
  const byOperator = groupOrders(orders, "operator").filter((r) => r.name !== "—");
  const byBatch = groupOrders(orders, "batch").filter((r) => r.name !== "—");
  const materials = groupConsumedMaterials(orders);

  // Редове за CSV export (клиентски).
  const csvRows: ReportRow[] = filtered.map((o) => ({
    number: o.number, date: o.producedAt.toISOString().slice(0, 10), product: o.outputName, batch: o.outputBatch ?? "",
    quantity: o.quantity, unit: o.unit, materialsCost: o.materialsCost ?? 0, unitCost: o.unitCost ?? 0,
    operator: o.operatorName ?? "", status: o.status,
  }));

  const kpis = [
    { label: t("prodReports.kpi.count"), value: String(sum.count) },
    { label: t("prodReports.kpi.qty"), value: String(sum.producedQty) },
    { label: t("prodReports.kpi.value"), value: formatCurrency(sum.producedValue) },
    { label: t("prodReports.kpi.materials"), value: formatCurrency(sum.materialsCost) },
    { label: t("prodReports.kpi.avgUnit"), value: formatCurrency(sum.avgUnitCost) },
  ];

  const Group = ({ title, rows, showQty = true }: { title: string; rows: { name: string; count: number; qty: number; value: number; materials: number }[]; showQty?: boolean }) => (
    <div>
      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--brass)", letterSpacing: 1, marginBottom: 8, textTransform: "uppercase" }}>{title}</div>
      {rows.length === 0 ? <div style={{ fontSize: 12, color: "var(--muted)" }}>—</div> : (
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          {rows.slice(0, 10).map((r) => (
            <div key={r.name} style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, gap: 8 }}>
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.name} <span style={{ color: "var(--muted)" }}>({r.count}{showQty ? ` · ${r.qty}` : ""})</span></span>
              <strong className="num">{formatCurrency(r.value)}</strong>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
        <Link href="/dashboard/production" style={{ color: "var(--muted)", textDecoration: "none", fontSize: 13 }}>← {t("prodReports.back")}</Link>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 600, margin: 0 }}>{t("prodReports.title")}</h1>
      </div>

      <ProductionReportTools from={sp.from ?? from.toISOString().slice(0, 10)} to={sp.to ?? to.toISOString().slice(0, 10)} q={sp.q ?? ""} rows={csvRows} />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 10, margin: "14px 0" }}>
        {kpis.map((k) => (
          <div key={k.label} className="glass kpi-card">
            <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 6 }}>{k.label}</div>
            <div className="num" style={{ fontSize: 18, fontWeight: 700 }}>{k.value}</div>
          </div>
        ))}
      </div>

      <div className="glass panel" style={{ padding: "16px 20px", marginBottom: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 18 }}>
          <Group title={t("prodReports.byProduct")} rows={byProduct} />
          <Group title={t("prodReports.byOperator")} rows={byOperator} />
          <Group title={t("prodReports.byBatch")} rows={byBatch} />
        </div>
      </div>

      {/* Разход на суровини */}
      <div className="glass panel bi-table" style={{ padding: "8px 0", overflowX: "auto" }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--brass)", letterSpacing: 1, padding: "8px 16px", textTransform: "uppercase" }}>{t("prodReports.materials")}</div>
        {materials.length === 0 ? <div style={{ fontSize: 12.5, color: "var(--muted)", padding: "0 16px 12px" }}>—</div> : (
          <table>
            <thead><tr><th>{t("prodReports.material")}</th><th className="num">{t("prodReports.qty")}</th><th className="num">{t("prodReports.cost")}</th></tr></thead>
            <tbody>
              {materials.map((m) => (
                <tr key={m.name}><td>{m.name}</td><td className="num">{m.qty}</td><td className="num">{formatCurrency(m.cost)}</td></tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <p style={{ fontSize: 11, color: "var(--muted)", marginTop: 10 }}>{t("prodReports.note", { from: from.toLocaleDateString(locale), to: to.toLocaleDateString(locale) })}</p>
    </>
  );
}
