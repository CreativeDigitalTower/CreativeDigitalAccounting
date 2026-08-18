import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fashionApiGuard } from "@/lib/fashion/access";
import { audit } from "@/lib/documents";

// Отключване на приключен отчет: ВРЪЩА складовите движения (възстановява наличността +
// намалява „sold") и връща отчета в чернова. Всичко в транзакция + audit.
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await fashionApiGuard("manage_sales_reports");
  if (!g.ok) return g.res;
  try {
    const { id } = await params;
    const result = await prisma.$transaction(async (tx) => {
      const rep = await tx.fashionSalesReport.findFirst({ where: { id, companyId: g.companyId }, include: { lines: true } });
      if (!rep) return { error: "Не е намерен.", status: 404 as const };
      if (rep.status !== "finalized") return { error: "Отчетът не е приключен.", status: 409 as const };
      for (const line of rep.lines) {
        // Възстановява наличността и намалява продадените.
        await tx.fashionFinishedGood.update({ where: { id: line.finishedGoodId }, data: { available: { increment: line.quantity }, sold: { decrement: line.quantity } } });
        await tx.fashionFinishedGoodMovement.create({ data: { companyId: g.companyId, finishedGoodId: line.finishedGoodId, type: "ADJUSTMENT", direction: "in", quantity: line.quantity, sourceType: "FashionSalesReport", sourceId: id, userId: g.userId, note: `Отключен отчет ${rep.period}` } });
      }
      await tx.fashionSalesReport.update({ where: { id }, data: { status: "draft", revenue: 0, cogs: 0, grossProfit: 0, units: 0, finalizedAt: null, finalizedById: null, unlockedAt: new Date() } });
      return { ok: true as const, period: rep.period };
    });
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
    await audit(g.companyId, g.userId, "status_change", "FashionSalesReport", id, `Отключен ${result.period} (движенията върнати)`);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}
