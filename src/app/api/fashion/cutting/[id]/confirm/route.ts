import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fashionApiGuard, getFashionSettings } from "@/lib/fashion/access";
import { applyMaterialMovement, InsufficientStockError } from "@/lib/fashion/movements";
import { audit } from "@/lib/documents";
import { z } from "zod";

const schema = z.object({ actualFabric: z.number().positive().optional(), waste: z.number().min(0).optional() });

// Потвърждаване на кроене: ТРАНЗАКЦИОННО приспада реалния разход плат от склада
// (CUTTING_CONSUMPTION движение) и заключва партидата. Idempotent — само от статус
// „draft" → „confirmed"; повторно потвърждаване/refresh НЕ приспада повторно.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await fashionApiGuard("manage_cutting");
  if (!g.ok) return g.res;
  try {
    const { id } = await params;
    const d = schema.parse(await req.json().catch(() => ({})));
    const settings = await getFashionSettings(g.companyId);

    const result = await prisma.$transaction(async (tx) => {
      const batch = await tx.fashionCuttingBatch.findFirst({
        where: { id, companyId: g.companyId },
        select: { id: true, status: true, materialId: true, actualFabric: true, code: true },
      });
      if (!batch) return { error: "Не е намерен.", status: 404 as const };
      if (batch.status !== "draft") return { error: "Кроенето вече е потвърдено.", status: 409 as const };

      const actual = d.actualFabric ?? batch.actualFabric;
      if (!(actual > 0)) return { error: "Задайте реален разход на плат преди потвърждаване.", status: 400 as const };

      // Приспада плата от склада (out) — блокира при недостиг (освен allowNegative).
      await applyMaterialMovement(tx, g.companyId, {
        materialId: batch.materialId, type: "CUTTING_CONSUMPTION", direction: "out", quantity: actual,
        sourceType: "FashionCuttingBatch", sourceId: batch.id, userId: g.userId, note: `Кроене ${batch.code}`,
      }, settings.allowNegativeStock);

      await tx.fashionCuttingBatch.update({
        where: { id }, data: { status: "confirmed", confirmedAt: new Date(), actualFabric: actual, ...(d.waste != null ? { waste: d.waste } : {}) },
      });
      return { ok: true as const, code: batch.code, actual };
    });

    if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
    await audit(g.companyId, g.userId, "status_change", "FashionCuttingBatch", id, `Кроене ${result.code} потвърдено · разход ${result.actual}`);
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof InsufficientStockError) return NextResponse.json({ error: "Недостатъчна наличност на плат за кроенето.", insufficient: true }, { status: 409 });
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Невалидни данни." }, { status: 400 });
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}
