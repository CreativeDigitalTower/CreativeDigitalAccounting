import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { fashionApiGuard } from "@/lib/fashion/access";
import { audit } from "@/lib/documents";
import { z } from "zod";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await fashionApiGuard("view_fashion");
  if (!g.ok) return g.res;
  const { id } = await params;
  const m = await prisma.fashionMaterial.findFirst({
    where: { id, companyId: g.companyId },
    include: { category: { select: { id: true, name: true } } },
  });
  if (!m) return NextResponse.json({ error: "Не е намерен." }, { status: 404 });
  const supplier = m.supplierId ? await prisma.supplier.findUnique({ where: { id: m.supplierId }, select: { id: true, name: true } }) : null;
  return NextResponse.json({ ...m, supplierName: supplier?.name ?? null, totalValue: Math.round(m.quantity * m.avgCost * 100) / 100 });
}

// Редактира МЕТАДАННИ на материала (не наличност/цена — те се управляват от ledger).
const schema = z.object({
  name: z.string().min(1).max(160).optional(),
  categoryId: z.string().nullable().optional(),
  sku: z.string().max(80).nullable().optional(),
  supplierId: z.string().nullable().optional(),
  brand: z.string().max(120).nullable().optional(),
  description: z.string().max(2000).nullable().optional(),
  colorName: z.string().max(80).nullable().optional(),
  colorCode: z.string().max(40).nullable().optional(),
  unit: z.string().max(20).optional(),
  minQuantity: z.number().min(0).nullable().optional(),
  currency: z.string().max(3).optional(),
  active: z.boolean().optional(),
  photoUrl: z.string().nullable().optional(),
  note: z.string().max(2000).nullable().optional(),
  composition: z.string().max(200).nullable().optional(),
  widthCm: z.number().min(0).nullable().optional(),
  weightGsm: z.number().min(0).nullable().optional(),
  elasticityPct: z.number().min(0).nullable().optional(),
  elasticityDir: z.string().max(40).nullable().optional(),
  threadType: z.string().max(80).nullable().optional(),
  threadThickness: z.string().max(40).nullable().optional(),
  metersPerSpool: z.number().min(0).nullable().optional(),
  spoolsCount: z.number().min(0).nullable().optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await fashionApiGuard("manage_materials");
  if (!g.ok) return g.res;
  try {
    const { id } = await params;
    const existing = await prisma.fashionMaterial.findFirst({ where: { id, companyId: g.companyId }, select: { id: true } });
    if (!existing) return NextResponse.json({ error: "Не е намерен." }, { status: 404 });
    const d = schema.parse(await req.json());
    const m = await prisma.fashionMaterial.update({
      where: { id }, data: { ...d, ...(d.name ? { name: d.name.trim() } : {}), ...(d.sku !== undefined ? { sku: d.sku?.trim() || null } : {}) },
    });
    await audit(g.companyId, g.userId, "update", "FashionMaterial", id, `Материал: ${m.name}`);
    return NextResponse.json(m);
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") return NextResponse.json({ error: "Материал с този SKU вече съществува." }, { status: 409 });
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Невалидни данни." }, { status: 400 });
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}
