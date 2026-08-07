import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireFeature } from "@/lib/session";
import { audit } from "@/lib/documents";
import { freeQuantity } from "@/lib/stock";
import { z } from "zod";

// Резервиране/освобождаване на количество от артикул. Резервираното не се изписва
// от свободната наличност, докато не бъде освободено. Не влияе на quantity.
const schema = z.object({
  stockItemId: z.string(),
  action: z.enum(["reserve", "release"]),
  quantity: z.number().positive(),
  note: z.string().max(200).optional().nullable(),
});

export async function POST(req: Request) {
  try {
    const { companyId, userId } = await requireFeature("warehouse");
    const data = schema.parse(await req.json());
    const item = await prisma.stockItem.findFirst({ where: { id: data.stockItemId, companyId } });
    if (!item) return NextResponse.json({ error: "Невалиден артикул." }, { status: 400 });

    if (data.action === "reserve") {
      const free = freeQuantity(item.quantity, item.reservedQuantity);
      if (free < data.quantity) {
        return NextResponse.json({ error: `Недостатъчно свободно количество за резервиране. Свободни: ${free} ${item.unit}.` }, { status: 400 });
      }
      await prisma.$transaction([
        prisma.stockReservation.create({ data: { stockItemId: item.id, quantity: data.quantity, note: data.note ?? null } }),
        prisma.stockItem.update({ where: { id: item.id }, data: { reservedQuantity: { increment: data.quantity } } }),
      ]);
      await audit(companyId, userId, "update", "StockItem", item.id, `Резервирани +${data.quantity} ${item.unit}`);
    } else {
      const release = Math.min(data.quantity, item.reservedQuantity);
      if (release <= 0) return NextResponse.json({ error: "Няма резервирано количество за освобождаване." }, { status: 400 });
      await prisma.$transaction([
        prisma.stockItem.update({ where: { id: item.id }, data: { reservedQuantity: { decrement: release } } }),
        prisma.stockReservation.updateMany({ where: { stockItemId: item.id, releasedAt: null }, data: { releasedAt: new Date() } }),
      ]);
      await audit(companyId, userId, "update", "StockItem", item.id, `Освободени −${release} ${item.unit}`);
    }
    const fresh = await prisma.stockItem.findUnique({ where: { id: item.id }, select: { quantity: true, reservedQuantity: true } });
    return NextResponse.json({ success: true, reservedQuantity: fresh?.reservedQuantity ?? 0, free: freeQuantity(fresh?.quantity ?? 0, fresh?.reservedQuantity ?? 0) });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Невалидни данни." }, { status: 400 });
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}
