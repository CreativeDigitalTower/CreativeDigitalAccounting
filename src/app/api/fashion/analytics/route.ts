import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fashionApiGuard } from "@/lib/fashion/access";
import { sellThroughRate, defectRate, materialWastePct, grossMarginPct, topN, bottomN } from "@/lib/fashion/analytics";

// Аналитики (§24) с филтри по период/модел/колекция. Read-only агрегиране.
export async function GET(req: Request) {
  const g = await fashionApiGuard("view_analytics");
  if (!g.ok) return g.res;
  const cid = g.companyId;
  const url = new URL(req.url);
  const from = url.searchParams.get("from") || undefined; // YYYY-MM
  const to = url.searchParams.get("to") || undefined;
  const collection = url.searchParams.get("collection") || undefined;

  const styleWhere = { companyId: cid, ...(collection ? { collection } : {}) };
  const periodWhere = (from || to) ? { period: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {};

  const [styles, fgRows, orders, cutting, salesLines] = await Promise.all([
    prisma.fashionStyle.findMany({ where: styleWhere, select: { id: true, code: true, name: true, collection: true } }),
    prisma.fashionFinishedGood.findMany({ where: { companyId: cid }, select: { styleId: true, sku: true, size: true, color: true, sold: true, available: true, produced: true } }),
    prisma.fashionProductionOrder.findMany({ where: { companyId: cid }, select: { styleId: true, qtyDefective: true, lines: { select: { cutQuantity: true } } } }),
    prisma.fashionCuttingBatch.findMany({ where: { companyId: cid, status: "confirmed" }, select: { actualFabric: true, waste: true } }),
    prisma.fashionSalesLine.findMany({ where: { report: { companyId: cid, status: "finalized", ...periodWhere } }, select: { quantity: true, revenue: true, cogs: true, finishedGood: { select: { styleId: true, size: true, color: true } } } }),
  ]);

  const styleIds = new Set(styles.map((s) => s.id));
  const nameOf = new Map(styles.map((s) => [s.id, s.code]));

  // Продажби по модел/размер/цвят (само за филтрираните модели).
  const byStyle = new Map<string, { units: number; revenue: number; cogs: number }>();
  const bySize = new Map<string, number>();
  const byColor = new Map<string, number>();
  for (const l of salesLines) {
    const sid = l.finishedGood.styleId;
    if (!styleIds.has(sid)) continue;
    const cur = byStyle.get(sid) ?? { units: 0, revenue: 0, cogs: 0 };
    cur.units += l.quantity; cur.revenue += l.revenue; cur.cogs += l.cogs; byStyle.set(sid, cur);
    bySize.set(l.finishedGood.size || "—", (bySize.get(l.finishedGood.size || "—") ?? 0) + l.quantity);
    byColor.set(l.finishedGood.color || "—", (byColor.get(l.finishedGood.color || "—") ?? 0) + l.quantity);
  }

  const salesByStyle = [...byStyle.entries()].map(([sid, v]) => ({
    code: nameOf.get(sid) ?? sid, units: v.units, revenue: Math.round(v.revenue * 100) / 100,
    grossProfit: Math.round((v.revenue - v.cogs) * 100) / 100, grossMarginPct: grossMarginPct(v.revenue, v.revenue - v.cogs),
  })).sort((a, b) => b.revenue - a.revenue);

  // Sell-through + производство/дефекти по модел.
  const prodByStyle = new Map<string, { cut: number; defective: number }>();
  for (const o of orders) {
    if (!styleIds.has(o.styleId)) continue;
    const cur = prodByStyle.get(o.styleId) ?? { cut: 0, defective: 0 };
    cur.cut += o.lines.reduce((x, l) => x + l.cutQuantity, 0); cur.defective += o.qtyDefective; prodByStyle.set(o.styleId, cur);
  }
  const soldByStyle = new Map<string, { sold: number; produced: number }>();
  for (const r of fgRows) {
    if (!styleIds.has(r.styleId)) continue;
    const cur = soldByStyle.get(r.styleId) ?? { sold: 0, produced: 0 };
    cur.sold += r.sold; cur.produced += r.produced; soldByStyle.set(r.styleId, cur);
  }

  const totalCut = [...prodByStyle.values()].reduce((s, v) => s + v.cut, 0);
  const totalDefective = [...prodByStyle.values()].reduce((s, v) => s + v.defective, 0);
  const totalSold = [...soldByStyle.values()].reduce((s, v) => s + v.sold, 0);
  const totalProduced = [...soldByStyle.values()].reduce((s, v) => s + v.produced, 0);
  const totalFabric = cutting.reduce((s, c) => s + c.actualFabric, 0);
  const totalWaste = cutting.reduce((s, c) => s + c.waste, 0);

  const marginByStyle = salesByStyle.map((s) => ({ key: s.code, value: s.grossMarginPct }));
  const bestSellers = topN(salesByStyle.map((s) => ({ key: s.code, value: s.units })), 5);
  const slowMovers = bottomN([...soldByStyle.entries()].filter(([sid]) => styleIds.has(sid)).map(([sid, v]) => ({ key: nameOf.get(sid) ?? sid, value: v.sold })), 5);

  return NextResponse.json({
    kpis: {
      sellThroughRate: sellThroughRate(totalSold, totalProduced),
      defectRate: defectRate(totalDefective, totalCut),
      materialWastePct: materialWastePct(totalWaste, totalFabric),
      totalRevenue: Math.round(salesLines.filter((l) => styleIds.has(l.finishedGood.styleId)).reduce((s, l) => s + l.revenue, 0) * 100) / 100,
    },
    salesByStyle, salesBySize: [...bySize.entries()].map(([k, v]) => ({ key: k, value: v })).sort((a, b) => b.value - a.value),
    salesByColor: [...byColor.entries()].map(([k, v]) => ({ key: k, value: v })).sort((a, b) => b.value - a.value),
    marginByStyle, bestSellers, slowMovers,
  });
}
