import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fashionApiGuard } from "@/lib/fashion/access";
import { audit } from "@/lib/documents";
import { bomBreakdown, bomMaterialCost, type BomLineInput } from "@/lib/fashion/bom";
import { z } from "zod";

// GET ?styleId=… (+ optional size/color) → редовете на рецептата + резолвирани количества
// и материална себестойност на бройка. Без styleId → обзор на моделите с базова себестойност.
export async function GET(req: Request) {
  const g = await fashionApiGuard("view_fashion");
  if (!g.ok) return g.res;
  const url = new URL(req.url);
  const styleId = url.searchParams.get("styleId") || undefined;
  const size = url.searchParams.get("size") || null;
  const color = url.searchParams.get("color") || null;

  if (!styleId) {
    // Обзор: всеки модел + базова материална себестойност (без размер/цвят).
    const styles = await prisma.fashionStyle.findMany({
      where: { companyId: g.companyId },
      select: {
        id: true, code: true, name: true, status: true,
        bomItems: { select: { quantity: true, material: { select: { avgCost: true } }, overrides: { select: { size: true, color: true, quantity: true } } } },
      },
      orderBy: { updatedAt: "desc" }, take: 2000,
    });
    return NextResponse.json(styles.map((s) => ({
      id: s.id, code: s.code, name: s.name, status: s.status, lineCount: s.bomItems.length,
      materialCost: bomMaterialCost(s.bomItems.map((b): BomLineInput => ({ materialId: "", baseQuantity: b.quantity, unit: "", unitCost: b.material.avgCost, overrides: b.overrides }))),
    })));
  }

  const style = await prisma.fashionStyle.findFirst({ where: { id: styleId, companyId: g.companyId }, select: { id: true, code: true, name: true, colors: true, sizes: true } });
  if (!style) return NextResponse.json({ error: "Моделът не е намерен." }, { status: 404 });
  const items = await prisma.fashionBomItem.findMany({
    where: { companyId: g.companyId, styleId },
    include: { material: { select: { name: true, unit: true, avgCost: true, currency: true } }, overrides: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
  const lines: (BomLineInput & { id: string; materialName: string; currency: string })[] = items.map((it) => ({
    id: it.id, materialId: it.materialId, materialName: it.material.name, baseQuantity: it.quantity,
    unit: it.unit, unitCost: it.material.avgCost, currency: it.material.currency,
    overrides: it.overrides.map((o) => ({ size: o.size, color: o.color, quantity: o.quantity })),
  }));
  const breakdown = bomBreakdown(lines, size, color).map((b, i) => ({ ...b, id: lines[i].id, materialName: lines[i].materialName, currency: lines[i].currency, rawOverrides: items[i].overrides }));
  return NextResponse.json({ style, size, color, lines: breakdown, materialCost: bomMaterialCost(lines, size, color) });
}

const schema = z.object({
  styleId: z.string(),
  materialId: z.string(),
  quantity: z.number().positive(),
  unit: z.string().max(20).optional(),
  note: z.string().max(500).nullable().optional(),
});

export async function POST(req: Request) {
  const g = await fashionApiGuard("manage_bom");
  if (!g.ok) return g.res;
  try {
    const d = schema.parse(await req.json());
    const [style, material] = await Promise.all([
      prisma.fashionStyle.findFirst({ where: { id: d.styleId, companyId: g.companyId }, select: { id: true } }),
      prisma.fashionMaterial.findFirst({ where: { id: d.materialId, companyId: g.companyId }, select: { id: true, unit: true } }),
    ]);
    if (!style) return NextResponse.json({ error: "Моделът не е намерен." }, { status: 404 });
    if (!material) return NextResponse.json({ error: "Материалът не е намерен." }, { status: 404 });
    const count = await prisma.fashionBomItem.count({ where: { styleId: d.styleId } });
    const item = await prisma.fashionBomItem.create({
      data: { companyId: g.companyId, styleId: d.styleId, materialId: d.materialId, quantity: d.quantity, unit: d.unit ?? material.unit, note: d.note ?? null, sortOrder: count },
    });
    await audit(g.companyId, g.userId, "create", "FashionBomItem", item.id, "BOM ред добавен");
    return NextResponse.json(item);
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Невалидни данни." }, { status: 400 });
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}
