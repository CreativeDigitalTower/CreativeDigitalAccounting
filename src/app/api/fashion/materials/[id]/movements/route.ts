import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fashionApiGuard, getFashionSettings } from "@/lib/fashion/access";
import { applyMaterialMovement, InsufficientStockError } from "@/lib/fashion/movements";
import { audit } from "@/lib/documents";
import { z } from "zod";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await fashionApiGuard("view_fashion");
  if (!g.ok) return g.res;
  const { id } = await params;
  const material = await prisma.fashionMaterial.findFirst({ where: { id, companyId: g.companyId }, select: { id: true } });
  if (!material) return NextResponse.json({ error: "Не е намерен." }, { status: 404 });
  const movements = await prisma.fashionInventoryMovement.findMany({
    where: { companyId: g.companyId, materialId: id },
    orderBy: { createdAt: "desc" }, take: 500,
  });
  return NextResponse.json(movements);
}

// Ръчна корекция на наличност (MANUAL_IN / MANUAL_OUT / STOCK_ADJUSTMENT). Транзакционно,
// с проверка за отрицателна наличност (освен ако е разрешено в настройките).
const schema = z.object({
  type: z.enum(["MANUAL_IN", "MANUAL_OUT", "STOCK_ADJUSTMENT"]),
  direction: z.enum(["in", "out"]).optional(),
  quantity: z.number().positive(),
  unitCost: z.number().min(0).nullable().optional(),
  note: z.string().max(500).nullable().optional(),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await fashionApiGuard("manage_materials");
  if (!g.ok) return g.res;
  try {
    const { id } = await params;
    const d = schema.parse(await req.json());
    const settings = await getFashionSettings(g.companyId);
    const direction = d.type === "MANUAL_IN" ? "in" : d.type === "MANUAL_OUT" ? "out" : d.direction;
    if (!direction) return NextResponse.json({ error: "Липсва посока за корекцията." }, { status: 400 });

    const result = await prisma.$transaction((tx) =>
      applyMaterialMovement(tx, g.companyId, {
        materialId: id, type: d.type, direction, quantity: d.quantity,
        unitCost: d.unitCost ?? null, sourceType: "manual", userId: g.userId, note: d.note ?? null,
      }, settings.allowNegativeStock),
    );
    await audit(g.companyId, g.userId, "update", "FashionMaterial", id, `Ръчна корекция (${d.type}): ${direction === "in" ? "+" : "-"}${d.quantity}`);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof InsufficientStockError) return NextResponse.json({ error: "Недостатъчна наличност за тази операция.", insufficient: true }, { status: 409 });
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Невалидни данни." }, { status: 400 });
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}
