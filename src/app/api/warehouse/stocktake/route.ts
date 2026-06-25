import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireFeature } from "@/lib/session";
import { audit } from "@/lib/documents";
import { z } from "zod";

const schema = z.object({
  note: z.string().optional().nullable(),
  lines: z.array(z.object({ stockItemId: z.string(), countedQty: z.number().min(0) })).min(1),
});

export async function POST(req: Request) {
  try {
    const { companyId, userId } = await requireFeature("revision");
    const data = schema.parse(await req.json());

    const items = await prisma.stockItem.findMany({ where: { companyId, id: { in: data.lines.map((l) => l.stockItemId) } } });
    const byId = new Map(items.map((i) => [i.id, i]));

    const stocktake = await prisma.stocktake.create({
      data: {
        companyId, note: data.note ?? null, status: "applied",
        lines: {
          create: data.lines.filter((l) => byId.has(l.stockItemId)).map((l) => ({
            stockItemId: l.stockItemId, itemName: byId.get(l.stockItemId)!.name,
            previousQty: byId.get(l.stockItemId)!.quantity, countedQty: l.countedQty,
          })),
        },
      },
    });

    // Прилагане: задава количеството на преброеното + движение за разликата
    for (const l of data.lines) {
      const item = byId.get(l.stockItemId);
      if (!item) continue;
      const diff = l.countedQty - item.quantity;
      if (diff !== 0) {
        await prisma.stockMovement.create({
          data: { stockItemId: item.id, type: "stocktake", quantity: diff, date: new Date(), note: `Ревизия: ${item.quantity} → ${l.countedQty}` },
        });
      }
      await prisma.stockItem.update({ where: { id: item.id }, data: { quantity: l.countedQty } });
    }

    await audit(companyId, userId, "create", "Stocktake", stocktake.id, `Ревизия на ${data.lines.length} артикула`);
    return NextResponse.json({ id: stocktake.id });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Невалидни данни." }, { status: 400 });
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}
