import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { fashionApiGuard } from "@/lib/fashion/access";
import { audit } from "@/lib/documents";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(1).max(80).optional(),
  code: z.string().max(40).nullable().optional(),
  active: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await fashionApiGuard("manage_settings");
  if (!g.ok) return g.res;
  try {
    const { id } = await params;
    const existing = await prisma.fashionMaterialCategory.findFirst({ where: { id, companyId: g.companyId }, select: { id: true } });
    if (!existing) return NextResponse.json({ error: "Не е намерена." }, { status: 404 });
    const d = schema.parse(await req.json());
    const cat = await prisma.fashionMaterialCategory.update({
      where: { id }, data: { ...d, ...(d.name ? { name: d.name.trim() } : {}) },
    });
    await audit(g.companyId, g.userId, "update", "FashionMaterialCategory", id, `Категория: ${cat.name}`);
    return NextResponse.json(cat);
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") return NextResponse.json({ error: "Категория с това име вече съществува." }, { status: 409 });
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Невалидни данни." }, { status: 400 });
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}
