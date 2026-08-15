import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logisticsApiGuard } from "@/lib/logistics/access";
import { audit } from "@/lib/documents";
import { z } from "zod";

const select = { id: true, baseCurrency: true, quoteCurrency: true, rate: true, date: true, source: true, note: true } as const;

export async function GET() {
  const g = await logisticsApiGuard("view_logistics");
  if (!g.ok) return g.res;
  const rows = await prisma.logisticsExchangeRate.findMany({ where: { companyId: g.companyId }, select, orderBy: [{ date: "desc" }, { createdAt: "desc" }], take: 200 });
  return NextResponse.json(rows);
}

const schema = z.object({
  baseCurrency: z.string().max(8).optional(),
  quoteCurrency: z.string().max(8).optional(),
  rate: z.number().positive(),
  date: z.string().datetime().nullable().optional().or(z.literal("").transform(() => null)),
  source: z.string().max(200).nullable().optional(),
  note: z.string().max(500).nullable().optional(),
});

export async function POST(req: Request) {
  const g = await logisticsApiGuard("manage_rates");
  if (!g.ok) return g.res;
  try {
    const d = schema.parse(await req.json());
    const row = await prisma.logisticsExchangeRate.create({
      data: {
        companyId: g.companyId, baseCurrency: d.baseCurrency || "EUR", quoteCurrency: d.quoteCurrency || "MKD",
        rate: d.rate, date: d.date ? new Date(d.date) : null, source: d.source ?? null, note: d.note ?? null,
      }, select,
    });
    await audit(g.companyId, g.userId, "create", "LogisticsExchangeRate", row.id, `Курс ${row.baseCurrency}/${row.quoteCurrency} = ${d.rate}`);
    return NextResponse.json(row);
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Невалидни данни." }, { status: 400 });
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}
