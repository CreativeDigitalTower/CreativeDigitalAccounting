import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fashionApiGuard } from "@/lib/fashion/access";
import { audit } from "@/lib/documents";
import { reportGrossMarginPct } from "@/lib/fashion/sales";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await fashionApiGuard("view_fashion");
  if (!g.ok) return g.res;
  const { id } = await params;
  const rep = await prisma.fashionSalesReport.findFirst({
    where: { id, companyId: g.companyId },
    include: { lines: { include: { finishedGood: { select: { sku: true, available: true, unitCost: true, style: { select: { code: true } } } } }, orderBy: { id: "asc" } } },
  });
  if (!rep) return NextResponse.json({ error: "Не е намерен." }, { status: 404 });
  return NextResponse.json({ ...rep, grossMarginPct: reportGrossMarginPct(rep.revenue, rep.grossProfit) });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await fashionApiGuard("manage_sales_reports");
  if (!g.ok) return g.res;
  const { id } = await params;
  const rep = await prisma.fashionSalesReport.findFirst({ where: { id, companyId: g.companyId }, select: { id: true, status: true } });
  if (!rep) return NextResponse.json({ error: "Не е намерен." }, { status: 404 });
  if (rep.status !== "draft") return NextResponse.json({ error: "Приключен отчет не се изтрива." }, { status: 409 });
  await prisma.fashionSalesReport.delete({ where: { id } });
  await audit(g.companyId, g.userId, "delete", "FashionSalesReport", id, "Изтрит чернови отчет");
  return NextResponse.json({ success: true });
}
