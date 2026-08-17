import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fashionApiGuard, getFashionSettings } from "@/lib/fashion/access";
import { applyMaterialMovement, InsufficientStockError } from "@/lib/fashion/movements";
import { audit } from "@/lib/documents";
import { SAMPLE_TYPES } from "@/lib/fashion/qc";
import { z } from "zod";

export async function GET() {
  const g = await fashionApiGuard("view_fashion");
  if (!g.ok) return g.res;
  const samples = await prisma.fashionSample.findMany({
    where: { companyId: g.companyId }, include: { style: { select: { code: true, name: true } } },
    orderBy: { createdAt: "desc" }, take: 1000,
  });
  const matIds = [...new Set(samples.map((s) => s.materialId).filter(Boolean) as string[])];
  const mats = matIds.length ? await prisma.fashionMaterial.findMany({ where: { id: { in: matIds } }, select: { id: true, name: true } }) : [];
  const matName = new Map(mats.map((m) => [m.id, m.name]));
  return NextResponse.json(samples.map((s) => ({
    id: s.id, type: s.type, quantity: s.quantity, color: s.color, size: s.size, date: s.date,
    styleCode: s.style.code, styleName: s.style.name, materialName: s.materialId ? matName.get(s.materialId) ?? null : null, materialQty: s.materialQty,
  })));
}

const schema = z.object({
  styleId: z.string(),
  type: z.enum(SAMPLE_TYPES),
  color: z.string().max(80).nullable().optional(),
  size: z.string().max(40).nullable().optional(),
  quantity: z.number().int().positive().optional(),
  materialId: z.string().nullable().optional(),
  materialQty: z.number().positive().nullable().optional(),
  note: z.string().max(500).nullable().optional(),
});

// Създава мостра. Ако е зададен материал + количество → приспада се от склада
// (SAMPLE_CONSUMPTION, транзакционно). Мострата НЕ влиза в готовата продукция.
export async function POST(req: Request) {
  const g = await fashionApiGuard("manage_production");
  if (!g.ok) return g.res;
  try {
    const d = schema.parse(await req.json());
    const style = await prisma.fashionStyle.findFirst({ where: { id: d.styleId, companyId: g.companyId }, select: { id: true } });
    if (!style) return NextResponse.json({ error: "Моделът не е намерен." }, { status: 404 });
    const deduct = d.materialId && d.materialQty && d.materialQty > 0;
    if (deduct) {
      const m = await prisma.fashionMaterial.findFirst({ where: { id: d.materialId!, companyId: g.companyId }, select: { id: true } });
      if (!m) return NextResponse.json({ error: "Материалът не е намерен." }, { status: 404 });
    }
    const settings = await getFashionSettings(g.companyId);

    const sample = await prisma.$transaction(async (tx) => {
      const s = await tx.fashionSample.create({
        data: {
          companyId: g.companyId, styleId: d.styleId, type: d.type, color: d.color ?? null, size: d.size ?? null,
          quantity: d.quantity ?? 1, materialId: d.materialId ?? null, materialQty: d.materialQty ?? null, note: d.note ?? null, createdById: g.userId,
        },
        select: { id: true },
      });
      if (deduct) {
        await applyMaterialMovement(tx, g.companyId, {
          materialId: d.materialId!, type: "SAMPLE_CONSUMPTION", direction: "out", quantity: d.materialQty!,
          sourceType: "FashionSample", sourceId: s.id, userId: g.userId, note: "Мостра",
        }, settings.allowNegativeStock);
      }
      return s;
    });
    await audit(g.companyId, g.userId, "create", "FashionSample", sample.id, `Мостра (${d.type})`);
    return NextResponse.json({ id: sample.id });
  } catch (err) {
    if (err instanceof InsufficientStockError) return NextResponse.json({ error: "Недостатъчна наличност за мострата.", insufficient: true }, { status: 409 });
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Невалидни данни." }, { status: 400 });
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}
