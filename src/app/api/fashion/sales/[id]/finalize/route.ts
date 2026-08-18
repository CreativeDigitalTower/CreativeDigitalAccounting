import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fashionApiGuard, getFashionSettings } from "@/lib/fashion/access";
import { applyFgMovement, FgInsufficientError } from "@/lib/fashion/fgService";
import { audit } from "@/lib/documents";
import { lineRevenue, lineCogs, salesTotals } from "@/lib/fashion/sales";

// Приключване: ТРАНЗАКЦИОННО намалява готовата наличност (SALE), снапшотва себестойност,
// изчислява приход/COGS/печалба и ЗАКЛЮЧВА отчета. Idempotent (само draft→finalized).
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await fashionApiGuard("manage_sales_reports");
  if (!g.ok) return g.res;
  try {
    const { id } = await params;
    const settings = await getFashionSettings(g.companyId);
    const result = await prisma.$transaction(async (tx) => {
      const rep = await tx.fashionSalesReport.findFirst({
        where: { id, companyId: g.companyId },
        include: { lines: { include: { finishedGood: { select: { id: true, unitCost: true } } } } },
      });
      if (!rep) return { error: "Не е намерен.", status: 404 as const };
      if (rep.status !== "draft") return { error: "Отчетът вече е приключен.", status: 409 as const };
      if (!rep.lines.length) return { error: "Отчетът няма редове.", status: 400 as const };

      const totalsInput = [] as { quantity: number; price: number; discount: number; unitCost: number }[];
      for (const line of rep.lines) {
        const unitCost = line.finishedGood.unitCost;
        // Намалява наличността (SALE) — блокира при недостиг (освен allowNegative).
        await applyFgMovement(tx, g.companyId, line.finishedGoodId, {
          type: "SALE", quantity: line.quantity, unitCost, sourceType: "FashionSalesReport", sourceId: id, userId: g.userId, note: `Отчет ${rep.period}`,
        }, settings.allowNegativeStock);
        const rev = lineRevenue(line.quantity, line.price, line.discount);
        const cogs = lineCogs(line.quantity, unitCost);
        await tx.fashionSalesLine.update({ where: { id: line.id }, data: { unitCostSnapshot: unitCost, revenue: rev, cogs } });
        totalsInput.push({ quantity: line.quantity, price: line.price, discount: line.discount, unitCost });
      }
      const totals = salesTotals(totalsInput);
      await tx.fashionSalesReport.update({
        where: { id }, data: { status: "finalized", revenue: totals.revenue, cogs: totals.cogs, grossProfit: totals.grossProfit, units: totals.units, finalizedAt: new Date(), finalizedById: g.userId },
      });
      return { ok: true as const, period: rep.period, totals };
    });
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
    await audit(g.companyId, g.userId, "status_change", "FashionSalesReport", id, `Приключен ${result.period}: приход ${result.totals.revenue}, печалба ${result.totals.grossProfit}`);
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof FgInsufficientError) return NextResponse.json({ error: "Недостатъчна наличност за продажбата.", insufficient: true }, { status: 409 });
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}
