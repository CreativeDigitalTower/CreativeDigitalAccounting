import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fashionApiGuard } from "@/lib/fashion/access";
import { defectRate } from "@/lib/fashion/analytics";
import { fgStockValue } from "@/lib/fashion/finishedGoods";

// Обобщено табло на модула (§23). Read-only агрегиране.
export async function GET() {
  const g = await fashionApiGuard("view_analytics");
  if (!g.ok) return g.res;
  const cid = g.companyId;
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const [materials, lowStock, recentDeliveries, orders, fgRows, monthReport, topSellers] = await Promise.all([
    prisma.fashionMaterial.findMany({ where: { companyId: cid, active: true }, select: { quantity: true, avgCost: true, minQuantity: true, category: { select: { name: true } } } }),
    prisma.fashionMaterial.count({ where: { companyId: cid, active: true, minQuantity: { not: null } } }),
    prisma.fashionMaterialDelivery.findMany({ where: { companyId: cid }, select: { id: true, date: true, invoiceNumber: true, lines: { select: { id: true } } }, orderBy: { date: "desc" }, take: 5 }),
    prisma.fashionProductionOrder.findMany({ where: { companyId: cid }, select: { status: true, qtyReady: true, qtyDefective: true, qtyRepair: true, createdAt: true, lines: { select: { cutQuantity: true } } } }),
    prisma.fashionFinishedGood.findMany({ where: { companyId: cid }, select: { available: true, unitCost: true, retailPrice: true, sold: true, sku: true, style: { select: { code: true } } } }),
    prisma.fashionSalesReport.findFirst({ where: { companyId: cid, period } , select: { revenue: true, cogs: true, grossProfit: true, units: true, status: true } }),
    prisma.fashionFinishedGood.findMany({ where: { companyId: cid }, select: { sku: true, sold: true, available: true }, orderBy: { sold: "desc" }, take: 5 }),
  ]);

  const materialsValue = materials.reduce((s, m) => s + m.quantity * m.avgCost, 0);
  const lowStockCount = materials.filter((m) => m.minQuantity != null && m.quantity <= m.minQuantity).length;
  const lowFabric = materials.filter((m) => m.minQuantity != null && m.quantity <= m.minQuantity && m.category?.name === "Плат").length;

  const cut = orders.reduce((s, o) => s + o.lines.reduce((x, l) => x + l.cutQuantity, 0), 0);
  const inProduction = orders.filter((o) => ["sewing", "finishing", "qc"].includes(o.status)).length;
  const completedMonth = orders.filter((o) => o.status === "ready" && o.createdAt >= monthStart).length;
  const forQc = orders.filter((o) => o.status === "qc").length;
  const defective = orders.reduce((s, o) => s + o.qtyDefective, 0);
  const forRepair = orders.reduce((s, o) => s + o.qtyRepair, 0);
  const producedReady = orders.reduce((s, o) => s + o.qtyReady, 0);

  const fgValue = fgStockValue(fgRows.map((r) => ({ available: r.available, unitCost: r.unitCost, retailPrice: r.retailPrice })));
  const readyForSale = fgRows.reduce((s, r) => s + r.available, 0);
  const slowMovers = [...fgRows].filter((r) => r.available > 0).sort((a, b) => a.sold - b.sold).slice(0, 5);

  return NextResponse.json({
    materials: { value: Math.round(materialsValue * 100) / 100, tracked: lowStock, lowStockCount, lowFabric, recentDeliveries: recentDeliveries.map((d) => ({ id: d.id, date: d.date, invoiceNumber: d.invoiceNumber, lines: d.lines.length })) },
    production: { cut, inProduction, completedMonth, forQc, defective, forRepair, defectRate: defectRate(defective, cut || producedReady) },
    finishedGoods: { readyForSale, cost: fgValue.cost, retail: fgValue.retail },
    sales: monthReport ? { period, ...monthReport } : { period, revenue: 0, cogs: 0, grossProfit: 0, units: 0, status: "none" },
    topSellers: topSellers.filter((s) => s.sold > 0).map((s) => ({ sku: s.sku, sold: s.sold })),
    slowMovers: slowMovers.map((s) => ({ sku: s.sku, available: s.available, sold: s.sold })),
  });
}
