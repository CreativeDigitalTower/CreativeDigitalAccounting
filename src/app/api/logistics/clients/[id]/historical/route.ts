import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logisticsApiGuard } from "@/lib/logistics/access";
import { audit } from "@/lib/documents";
import { z } from "zod";

async function ownedClient(companyId: string, id: string) {
  return prisma.client.findFirst({ where: { id, companyId }, select: { id: true } });
}

const schema = z.object({
  // година метрика (upsert по година) ИЛИ продуктова метрика
  kind: z.enum(["year", "product"]),
  year: z.number().int().min(1990).max(2100),
  revenue: z.number().nonnegative().nullable().optional(),
  quantity: z.number().nonnegative().nullable().optional(),
  unit: z.string().max(20).optional(),
  note: z.string().max(500).nullable().optional(),
  product: z.string().max(200).optional(),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await logisticsApiGuard("manage_historical");
  if (!g.ok) return g.res;
  try {
    const { id } = await params;
    if (!(await ownedClient(g.companyId, id))) return NextResponse.json({ error: "Клиентът не е намерен." }, { status: 404 });
    const d = schema.parse(await req.json());

    if (d.kind === "year") {
      const row = await prisma.clientHistoricalMetric.upsert({
        where: { clientId_year: { clientId: id, year: d.year } },
        create: { clientId: id, year: d.year, revenue: d.revenue ?? null, quantity: d.quantity ?? null, unit: d.unit || "t", note: d.note ?? null },
        update: { revenue: d.revenue ?? null, quantity: d.quantity ?? null, unit: d.unit || "t", note: d.note ?? null },
        select: { id: true },
      });
      await audit(g.companyId, g.userId, "historical", "Client", id, `Исторически данни ${d.year}`);
      return NextResponse.json({ id: row.id });
    }
    // продуктова метрика
    if (!d.product) return NextResponse.json({ error: "Липсва продукт." }, { status: 400 });
    const row = await prisma.clientHistoricalProductMetric.create({
      data: { clientId: id, year: d.year, product: d.product, quantity: d.quantity ?? null, revenue: d.revenue ?? null }, select: { id: true },
    });
    await audit(g.companyId, g.userId, "historical", "Client", id, `Исторически продукт ${d.year} ${d.product}`);
    return NextResponse.json({ id: row.id });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Невалидни данни." }, { status: 400 });
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await logisticsApiGuard("manage_historical");
  if (!g.ok) return g.res;
  const { id } = await params;
  if (!(await ownedClient(g.companyId, id))) return NextResponse.json({ error: "Клиентът не е намерен." }, { status: 404 });
  const u = new URL(req.url);
  const kind = u.searchParams.get("kind");
  const rowId = u.searchParams.get("rowId");
  if (!rowId) return NextResponse.json({ error: "Липсва rowId." }, { status: 400 });
  if (kind === "product") await prisma.clientHistoricalProductMetric.deleteMany({ where: { id: rowId, clientId: id } });
  else await prisma.clientHistoricalMetric.deleteMany({ where: { id: rowId, clientId: id } });
  return NextResponse.json({ ok: true });
}
