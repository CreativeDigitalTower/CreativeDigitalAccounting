import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireFeature } from "@/lib/session";
import { audit } from "@/lib/documents";
import { z } from "zod";

const schema = z.object({
  stockItemId: z.string(),
  quantity: z.number().positive(),
  date: z.string(),
  note: z.string().optional().nullable(),
});

export async function POST(req: Request) {
  try {
    const { companyId, userId } = await requireFeature("warehouse");
    const data = schema.parse(await req.json());
    const item = await prisma.stockItem.findFirst({ where: { id: data.stockItemId, companyId } });
    if (!item) return NextResponse.json({ error: "Невалиден артикул." }, { status: 400 });
    if (item.quantity < data.quantity) {
      return NextResponse.json({ error: `Недостатъчна наличност. Налично: ${item.quantity} ${item.unit}.` }, { status: 400 });
    }
    await prisma.$transaction([
      prisma.stockMovement.create({
        data: { stockItemId: data.stockItemId, type: "scrap", quantity: data.quantity, unitPrice: item.unitCost ?? null, date: new Date(data.date), note: data.note ?? "Брак" },
      }),
      prisma.stockItem.update({ where: { id: data.stockItemId }, data: { quantity: { decrement: data.quantity } } }),
    ]);
    await audit(companyId, userId, "update", "StockItem", item.id, `Брак −${data.quantity}`);
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Невалидни данни." }, { status: 400 });
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}

// Архив с бракуванията
export async function GET() {
  try {
    const { companyId } = await requireFeature("revision");
    const movements = await prisma.stockMovement.findMany({
      where: { type: "scrap", stockItem: { companyId } },
      include: { stockItem: { select: { name: true, unit: true } } },
      orderBy: { date: "desc" },
      take: 100,
    });
    return NextResponse.json(movements.map((m) => ({
      id: m.id, name: m.stockItem.name, unit: m.stockItem.unit,
      quantity: Math.abs(m.quantity), date: m.date, note: m.note,
      value: m.unitPrice ? Math.abs(m.quantity) * m.unitPrice : null,
    })));
  } catch {
    return NextResponse.json([]);
  }
}
