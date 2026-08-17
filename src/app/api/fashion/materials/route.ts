import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { fashionApiGuard } from "@/lib/fashion/access";
import { audit } from "@/lib/documents";
import { z } from "zod";

// Списък с материали (+ филтри). Наличността/стойността идват от материала (ledger-managed).
export async function GET(req: Request) {
  const g = await fashionApiGuard("view_fashion");
  if (!g.ok) return g.res;
  const url = new URL(req.url);
  const categoryId = url.searchParams.get("categoryId") || undefined;
  const q = url.searchParams.get("q")?.trim().toLowerCase() || "";
  const lowStock = url.searchParams.get("lowStock") === "1";

  const materials = await prisma.fashionMaterial.findMany({
    where: { companyId: g.companyId, ...(categoryId ? { categoryId } : {}) },
    include: { category: { select: { name: true } } },
    orderBy: [{ active: "desc" }, { name: "asc" }],
    take: 2000,
  });
  // Доставчикът е плоско поле (без релация, за да не пипаме Supplier) → резолваме имената наведнъж.
  const supplierIds = [...new Set(materials.map((m) => m.supplierId).filter(Boolean) as string[])];
  const suppliers = supplierIds.length ? await prisma.supplier.findMany({ where: { id: { in: supplierIds } }, select: { id: true, name: true } }) : [];
  const supplierName = new Map(suppliers.map((s) => [s.id, s.name]));
  let rows = materials.map(({ category, ...m }) => ({
    ...m,
    categoryName: category?.name ?? null,
    supplierName: m.supplierId ? supplierName.get(m.supplierId) ?? null : null,
    totalValue: Math.round(m.quantity * m.avgCost * 100) / 100,
    isLow: m.minQuantity != null && m.quantity <= m.minQuantity,
  }));
  if (q) rows = rows.filter((m) => `${m.name} ${m.sku ?? ""} ${m.brand ?? ""} ${m.colorName ?? ""}`.toLowerCase().includes(q));
  if (lowStock) rows = rows.filter((m) => m.isLow);
  return NextResponse.json(rows);
}

const schema = z.object({
  name: z.string().min(1).max(160),
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
  photoUrl: z.string().nullable().optional(),
  note: z.string().max(2000).nullable().optional(),
  // Плат
  composition: z.string().max(200).nullable().optional(),
  widthCm: z.number().min(0).nullable().optional(),
  weightGsm: z.number().min(0).nullable().optional(),
  elasticityPct: z.number().min(0).nullable().optional(),
  elasticityDir: z.string().max(40).nullable().optional(),
  // Конец
  threadType: z.string().max(80).nullable().optional(),
  threadThickness: z.string().max(40).nullable().optional(),
  metersPerSpool: z.number().min(0).nullable().optional(),
  spoolsCount: z.number().min(0).nullable().optional(),
});

// Създава материал БЕЗ начална наличност — наличността идва само през доставки/движения.
export async function POST(req: Request) {
  const g = await fashionApiGuard("manage_materials");
  if (!g.ok) return g.res;
  try {
    const d = schema.parse(await req.json());
    if (d.categoryId) {
      const c = await prisma.fashionMaterialCategory.findFirst({ where: { id: d.categoryId, companyId: g.companyId }, select: { id: true } });
      if (!c) return NextResponse.json({ error: "Категорията не е намерена." }, { status: 404 });
    }
    if (d.supplierId) {
      const s = await prisma.supplier.findFirst({ where: { id: d.supplierId, companyId: g.companyId }, select: { id: true } });
      if (!s) return NextResponse.json({ error: "Доставчикът не е намерен." }, { status: 404 });
    }
    const m = await prisma.fashionMaterial.create({
      data: { companyId: g.companyId, ...d, name: d.name.trim(), sku: d.sku?.trim() || null },
    });
    await audit(g.companyId, g.userId, "create", "FashionMaterial", m.id, `Материал: ${m.name}`);
    return NextResponse.json(m);
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") return NextResponse.json({ error: "Материал с този SKU вече съществува." }, { status: 409 });
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Невалидни данни." }, { status: 400 });
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}
