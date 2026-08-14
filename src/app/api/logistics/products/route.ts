import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logisticsApiGuard } from "@/lib/logistics/access";
import { audit } from "@/lib/documents";
import { normalizeProductKey } from "@/lib/logistics/normalize";
import { z } from "zod";

const select = {
  id: true, canonicalName: true, materialCode: true, unit: true, packaging: true,
  active: true, notes: true, createdAt: true, updatedAt: true,
  aliases: { select: { id: true, alias: true } },
} as const;

export async function GET() {
  const g = await logisticsApiGuard("view_logistics");
  if (!g.ok) return g.res;
  const products = await prisma.logisticsProduct.findMany({
    where: { companyId: g.companyId }, select, orderBy: { canonicalName: "asc" },
  });
  return NextResponse.json(products);
}

const schema = z.object({
  canonicalName: z.string().min(1).max(200),
  materialCode: z.string().max(60).nullable().optional(),
  unit: z.string().min(1).max(20).default("t"),
  packaging: z.string().max(120).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
});

export async function POST(req: Request) {
  const g = await logisticsApiGuard("manage_rates");
  if (!g.ok) return g.res;
  try {
    const d = schema.parse(await req.json());
    const normalizedName = normalizeProductKey(d.canonicalName);
    if (!normalizedName) return NextResponse.json({ error: "Невалидно име." }, { status: 400 });
    // Предотвратяване на дубликат (различия във формат → един продукт).
    const existing = await prisma.logisticsProduct.findUnique({
      where: { companyId_normalizedName: { companyId: g.companyId, normalizedName } }, select: { id: true },
    });
    if (existing) return NextResponse.json({ error: "Вече съществува продукт с това наименование." }, { status: 409 });

    const product = await prisma.logisticsProduct.create({
      data: {
        companyId: g.companyId, canonicalName: d.canonicalName, normalizedName,
        materialCode: d.materialCode?.trim() || null, unit: d.unit, packaging: d.packaging ?? null, notes: d.notes ?? null,
      }, select,
    });
    await audit(g.companyId, g.userId, "create", "LogisticsProduct", product.id, `Продукт „${d.canonicalName}"`);
    return NextResponse.json(product);
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Невалидни данни." }, { status: 400 });
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}
