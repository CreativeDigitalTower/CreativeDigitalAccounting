import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { fashionApiGuard } from "@/lib/fashion/access";
import { audit } from "@/lib/documents";
import { STYLE_STATUSES, parseList } from "@/lib/fashion/styles";
import { z } from "zod";

export async function GET(req: Request) {
  const g = await fashionApiGuard("view_fashion");
  if (!g.ok) return g.res;
  const url = new URL(req.url);
  const status = url.searchParams.get("status") || undefined;
  const q = url.searchParams.get("q")?.trim().toLowerCase() || "";
  const styles = await prisma.fashionStyle.findMany({
    where: { companyId: g.companyId, ...(status ? { status } : {}) },
    select: {
      id: true, code: true, name: true, collection: true, category: true, season: true, year: true,
      status: true, photoUrl: true, colors: true, sizes: true, updatedAt: true,
      _count: { select: { patterns: true } },
    },
    orderBy: [{ updatedAt: "desc" }], take: 2000,
  });
  const rows = styles
    .map((s) => ({ ...s, patternCount: s._count.patterns }))
    .filter((s) => !q || `${s.code} ${s.name} ${s.collection ?? ""}`.toLowerCase().includes(q));
  return NextResponse.json(rows);
}

const schema = z.object({
  code: z.string().min(1).max(60),
  name: z.string().min(1).max(160),
  collection: z.string().max(120).nullable().optional(),
  category: z.string().max(120).nullable().optional(),
  season: z.string().max(60).nullable().optional(),
  year: z.number().int().min(2000).max(2100).nullable().optional(),
  description: z.string().max(4000).nullable().optional(),
  status: z.enum(STYLE_STATUSES).optional(),
  skuPrefix: z.string().max(40).nullable().optional(),
  serialized: z.boolean().optional(),
  editionSize: z.number().int().min(0).nullable().optional(),
  colors: z.string().nullable().optional(), // свободен списък → масив
  sizes: z.string().nullable().optional(),
  photoUrl: z.string().nullable().optional(),
  note: z.string().max(2000).nullable().optional(),
});

export async function POST(req: Request) {
  const g = await fashionApiGuard("manage_styles");
  if (!g.ok) return g.res;
  try {
    const d = schema.parse(await req.json());
    const style = await prisma.fashionStyle.create({
      data: {
        companyId: g.companyId, code: d.code.trim(), name: d.name.trim(),
        collection: d.collection ?? null, category: d.category ?? null, season: d.season ?? null,
        year: d.year ?? null, description: d.description ?? null, status: d.status ?? "idea",
        skuPrefix: d.skuPrefix?.trim() || null, colors: parseList(d.colors), sizes: parseList(d.sizes), serialized: d.serialized ?? false, editionSize: d.editionSize ?? null,
        photoUrl: d.photoUrl ?? null, note: d.note ?? null, createdById: g.userId,
      },
    });
    await audit(g.companyId, g.userId, "create", "FashionStyle", style.id, `Модел: ${style.code}`);
    return NextResponse.json(style);
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") return NextResponse.json({ error: "Модел с този код вече съществува." }, { status: 409 });
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Невалидни данни." }, { status: 400 });
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}
