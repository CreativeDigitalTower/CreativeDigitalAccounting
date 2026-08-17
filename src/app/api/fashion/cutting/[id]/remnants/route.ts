import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fashionApiGuard } from "@/lib/fashion/access";
import { audit } from "@/lib/documents";
import { REMNANT_STATUSES } from "@/lib/fashion/cutting";
import { z } from "zod";

const schema = z.object({
  widthCm: z.number().min(0).nullable().optional(),
  lengthCm: z.number().min(0).nullable().optional(),
  quantity: z.number().min(0).optional(),
  colorName: z.string().max(80).nullable().optional(),
  note: z.string().max(500).nullable().optional(),
});

// Регистрира използваем остатък от кроенето (§13). Остатъците са отделен регистър —
// не се връщат автоматично в наличността на плата.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await fashionApiGuard("manage_cutting");
  if (!g.ok) return g.res;
  try {
    const { id } = await params;
    const batch = await prisma.fashionCuttingBatch.findFirst({ where: { id, companyId: g.companyId }, select: { id: true, materialId: true, color: true } });
    if (!batch) return NextResponse.json({ error: "Не е намерен." }, { status: 404 });
    const d = schema.parse(await req.json());
    const r = await prisma.fashionRemnant.create({
      data: {
        companyId: g.companyId, batchId: id, materialId: batch.materialId, colorName: d.colorName ?? batch.color ?? null,
        widthCm: d.widthCm ?? null, lengthCm: d.lengthCm ?? null, quantity: d.quantity ?? 1, status: "available", note: d.note ?? null,
      },
    });
    await audit(g.companyId, g.userId, "create", "FashionRemnant", r.id, "Остатък регистриран");
    return NextResponse.json(r);
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Невалидни данни." }, { status: 400 });
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}

// Промяна на статуса на остатък (?remnantId=…): available|reserved|used|waste.
const statusSchema = z.object({ status: z.enum(REMNANT_STATUSES) });
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await fashionApiGuard("manage_cutting");
  if (!g.ok) return g.res;
  try {
    const { id } = await params;
    const remnantId = new URL(req.url).searchParams.get("remnantId");
    if (!remnantId) return NextResponse.json({ error: "Липсва remnantId." }, { status: 400 });
    const rem = await prisma.fashionRemnant.findFirst({ where: { id: remnantId, batchId: id, companyId: g.companyId }, select: { id: true } });
    if (!rem) return NextResponse.json({ error: "Не е намерен." }, { status: 404 });
    const d = statusSchema.parse(await req.json());
    await prisma.fashionRemnant.update({ where: { id: remnantId }, data: { status: d.status } });
    await audit(g.companyId, g.userId, "update", "FashionRemnant", remnantId, `Остатък → ${d.status}`);
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Невалидни данни." }, { status: 400 });
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}
