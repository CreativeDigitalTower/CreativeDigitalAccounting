import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { fashionApiGuard } from "@/lib/fashion/access";
import { audit } from "@/lib/documents";
import { isValidPeriod } from "@/lib/fashion/sales";
import { z } from "zod";

export async function GET() {
  const g = await fashionApiGuard("view_fashion");
  if (!g.ok) return g.res;
  const reports = await prisma.fashionSalesReport.findMany({
    where: { companyId: g.companyId }, include: { lines: { select: { id: true } } },
    orderBy: { period: "desc" }, take: 500,
  });
  return NextResponse.json(reports.map((r) => ({
    id: r.id, period: r.period, status: r.status, currency: r.currency, revenue: r.revenue, cogs: r.cogs,
    grossProfit: r.grossProfit, units: r.units, lineCount: r.lines.length, finalizedAt: r.finalizedAt,
  })));
}

const schema = z.object({ period: z.string(), note: z.string().max(500).nullable().optional() });
export async function POST(req: Request) {
  const g = await fashionApiGuard("manage_sales_reports");
  if (!g.ok) return g.res;
  try {
    const d = schema.parse(await req.json());
    if (!isValidPeriod(d.period)) return NextResponse.json({ error: "Невалиден период (ГГГГ-ММ)." }, { status: 400 });
    const rep = await prisma.fashionSalesReport.create({ data: { companyId: g.companyId, period: d.period, note: d.note ?? null, createdById: g.userId } });
    await audit(g.companyId, g.userId, "create", "FashionSalesReport", rep.id, `Отчет ${d.period}`);
    return NextResponse.json({ id: rep.id });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") return NextResponse.json({ error: "Вече има отчет за този период." }, { status: 409 });
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Невалидни данни." }, { status: 400 });
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}
