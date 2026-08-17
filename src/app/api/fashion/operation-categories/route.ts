import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { fashionApiGuard } from "@/lib/fashion/access";
import { seedFashionOperationCategories } from "@/lib/fashion/opCategories";
import { audit } from "@/lib/documents";
import { z } from "zod";

export async function GET() {
  const g = await fashionApiGuard("view_fashion");
  if (!g.ok) return g.res;
  const count = await prisma.fashionOperationCategory.count({ where: { companyId: g.companyId } });
  if (count === 0) await seedFashionOperationCategories(g.companyId);
  const cats = await prisma.fashionOperationCategory.findMany({
    where: { companyId: g.companyId }, orderBy: [{ active: "desc" }, { sortOrder: "asc" }, { name: "asc" }],
  });
  return NextResponse.json(cats);
}

const schema = z.object({ name: z.string().min(1).max(80), code: z.string().max(40).nullable().optional() });

export async function POST(req: Request) {
  const g = await fashionApiGuard("manage_settings");
  if (!g.ok) return g.res;
  try {
    const d = schema.parse(await req.json());
    const cat = await prisma.fashionOperationCategory.create({ data: { companyId: g.companyId, name: d.name.trim(), code: d.code ?? null } });
    await audit(g.companyId, g.userId, "create", "FashionOperationCategory", cat.id, `Категория операция: ${cat.name}`);
    return NextResponse.json(cat);
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") return NextResponse.json({ error: "Категория с това име вече съществува." }, { status: 409 });
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Невалидни данни." }, { status: 400 });
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}
