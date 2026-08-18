import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fashionApiGuard } from "@/lib/fashion/access";
import { audit } from "@/lib/documents";
import { STYLE_STATUSES, parseList } from "@/lib/fashion/styles";
import { z } from "zod";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await fashionApiGuard("view_fashion");
  if (!g.ok) return g.res;
  const { id } = await params;
  const style = await prisma.fashionStyle.findFirst({
    where: { id, companyId: g.companyId },
    include: {
      photos: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
      patterns: { orderBy: { version: "desc" } },
    },
  });
  if (!style) return NextResponse.json({ error: "Не е намерен." }, { status: 404 });
  return NextResponse.json(style);
}

const schema = z.object({
  code: z.string().min(1).max(60).optional(),
  name: z.string().min(1).max(160).optional(),
  collection: z.string().max(120).nullable().optional(),
  category: z.string().max(120).nullable().optional(),
  season: z.string().max(60).nullable().optional(),
  year: z.number().int().min(2000).max(2100).nullable().optional(),
  description: z.string().max(4000).nullable().optional(),
  status: z.enum(STYLE_STATUSES).optional(),
  skuPrefix: z.string().max(40).nullable().optional(),
  serialized: z.boolean().optional(),
  editionSize: z.number().int().min(0).nullable().optional(),
  colors: z.string().nullable().optional(),
  sizes: z.string().nullable().optional(),
  photoUrl: z.string().nullable().optional(),
  note: z.string().max(2000).nullable().optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await fashionApiGuard("manage_styles");
  if (!g.ok) return g.res;
  try {
    const { id } = await params;
    const existing = await prisma.fashionStyle.findFirst({ where: { id, companyId: g.companyId }, select: { id: true, status: true } });
    if (!existing) return NextResponse.json({ error: "Не е намерен." }, { status: 404 });
    const d = schema.parse(await req.json());
    const data: Record<string, unknown> = { ...d };
    if (d.code) data.code = d.code.trim();
    if (d.name) data.name = d.name.trim();
    if (d.colors !== undefined) data.colors = parseList(d.colors);
    if (d.sizes !== undefined) data.sizes = parseList(d.sizes);
    if (d.skuPrefix !== undefined) data.skuPrefix = d.skuPrefix?.trim() || null;
    // Одобряване → маркира approvedAt (веднъж).
    if (d.status === "approved" && existing.status !== "approved") data.approvedAt = new Date();
    const style = await prisma.fashionStyle.update({ where: { id }, data });
    await audit(g.companyId, g.userId, "update", "FashionStyle", id, `Модел: ${style.code}${d.status ? ` → ${d.status}` : ""}`);
    return NextResponse.json(style);
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Невалидни данни." }, { status: 400 });
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}
