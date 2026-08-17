import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { fashionApiGuard } from "@/lib/fashion/access";
import { seedFashionCategories } from "@/lib/fashion/categories";
import { audit } from "@/lib/documents";
import { z } from "zod";

export async function GET() {
  const g = await fashionApiGuard("view_fashion");
  if (!g.ok) return g.res;
  // Auto-seed на default категориите при първа употреба (idempotent).
  const count = await prisma.fashionMaterialCategory.count({ where: { companyId: g.companyId } });
  if (count === 0) await seedFashionCategories(g.companyId);
  const categories = await prisma.fashionMaterialCategory.findMany({
    where: { companyId: g.companyId }, orderBy: [{ active: "desc" }, { sortOrder: "asc" }, { name: "asc" }],
  });
  return NextResponse.json(categories);
}

const schema = z.object({ name: z.string().min(1).max(80), code: z.string().max(40).nullable().optional() });

export async function POST(req: Request) {
  const g = await fashionApiGuard("manage_settings");
  if (!g.ok) return g.res;
  try {
    const d = schema.parse(await req.json());
    const cat = await prisma.fashionMaterialCategory.create({
      data: { companyId: g.companyId, name: d.name.trim(), code: d.code ?? null },
    });
    await audit(g.companyId, g.userId, "create", "FashionMaterialCategory", cat.id, `Категория: ${cat.name}`);
    return NextResponse.json(cat);
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") return NextResponse.json({ error: "Категория с това име вече съществува." }, { status: 409 });
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Невалидни данни." }, { status: 400 });
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}
