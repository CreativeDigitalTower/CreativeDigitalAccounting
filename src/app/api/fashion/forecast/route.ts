import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fashionApiGuard } from "@/lib/fashion/access";
import { avgMonthlySales, stockCoverDays, suggestedProduction } from "@/lib/fashion/forecast";

// Stock cover + препоръчано производство по SKU (§25, §26). Read-only агрегиране.
// ?window=месеци за средни продажби (по подр. 3), ?target=целеви месеци покритие (по подр. 2).
export async function GET(req: Request) {
  const g = await fashionApiGuard("view_analytics");
  if (!g.ok) return g.res;
  const url = new URL(req.url);
  const windowMonths = Math.max(1, Math.min(12, Number(url.searchParams.get("window")) || 3));
  const targetMonths = Math.max(1, Math.min(12, Number(url.searchParams.get("target")) || 2));

  // Начален период (ГГГГ-ММ) на прозореца.
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - (windowMonths - 1), 1);
  const startPeriod = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}`;

  const [fgRows, salesLines] = await Promise.all([
    prisma.fashionFinishedGood.findMany({
      where: { companyId: g.companyId },
      select: { id: true, sku: true, available: true, minStock: true, style: { select: { code: true } } },
      orderBy: [{ style: { code: "asc" } }, { sku: "asc" }], take: 5000,
    }),
    prisma.fashionSalesLine.findMany({
      where: { report: { companyId: g.companyId, status: "finalized", period: { gte: startPeriod } } },
      select: { finishedGoodId: true, quantity: true },
    }),
  ]);

  const soldBy = new Map<string, number>();
  for (const l of salesLines) soldBy.set(l.finishedGoodId, (soldBy.get(l.finishedGoodId) ?? 0) + l.quantity);

  const rows = fgRows.map((r) => {
    const avg = avgMonthlySales(soldBy.get(r.id) ?? 0, windowMonths);
    return {
      id: r.id, sku: r.sku, styleCode: r.style.code, available: r.available, minStock: r.minStock,
      avgMonthly: avg, coverDays: stockCoverDays(r.available, avg),
      suggested: suggestedProduction(r.available, avg, r.minStock, targetMonths),
    };
  }).filter((r) => r.available > 0 || r.avgMonthly > 0 || r.suggested > 0);

  return NextResponse.json({ windowMonths, targetMonths, rows });
}
