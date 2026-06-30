import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/session";
import { slugify } from "@/lib/blog/slug";
import { z } from "zod";

const schema = z.object({
  title: z.string().min(2).optional(),
  slug: z.string().optional(),
  excerpt: z.string().nullable().optional(),
  content: z.string().optional(),
  coverImage: z.string().nullable().optional(),
  author: z.string().optional(),
  category: z.string().nullable().optional(),
  tags: z.string().nullable().optional(),
  metaTitle: z.string().nullable().optional(),
  metaDescription: z.string().nullable().optional(),
  keywords: z.string().nullable().optional(),
  status: z.enum(["draft", "published", "hidden"]).optional(),
  publishedAt: z.string().nullable().optional(),
});

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireSuperAdmin();
  try {
    const { id } = await params;
    const existing = await prisma.blogPost.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Не е намерена" }, { status: 404 });
    const d = schema.parse(await req.json());

    let slug = existing.slug;
    if (d.slug && slugify(d.slug) !== existing.slug) {
      slug = slugify(d.slug); let n = 1; const base = slug;
      while (await prisma.blogPost.findFirst({ where: { slug, NOT: { id } } })) slug = `${base}-${++n}`;
    }
    // ръчна дата на публикуване, иначе при първо публикуване → сега
    let publishedAt = existing.publishedAt;
    if (d.publishedAt !== undefined) publishedAt = d.publishedAt ? new Date(d.publishedAt) : null;
    if (d.status === "published" && !publishedAt) publishedAt = new Date();

    const post = await prisma.blogPost.update({
      where: { id },
      data: {
        slug,
        ...(d.title !== undefined ? { title: d.title } : {}),
        ...(d.excerpt !== undefined ? { excerpt: d.excerpt } : {}),
        ...(d.content !== undefined ? { content: d.content } : {}),
        ...(d.coverImage !== undefined ? { coverImage: d.coverImage } : {}),
        ...(d.author !== undefined ? { author: d.author } : {}),
        ...(d.category !== undefined ? { category: d.category } : {}),
        ...(d.tags !== undefined ? { tags: d.tags } : {}),
        ...(d.metaTitle !== undefined ? { metaTitle: d.metaTitle } : {}),
        ...(d.metaDescription !== undefined ? { metaDescription: d.metaDescription } : {}),
        ...(d.keywords !== undefined ? { keywords: d.keywords } : {}),
        ...(d.status !== undefined ? { status: d.status, published: d.status === "published" } : {}),
        publishedAt,
      },
    });
    return NextResponse.json(post);
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Невалидни данни" }, { status: 400 });
    return NextResponse.json({ error: "Сървърна грешка" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireSuperAdmin();
  const { id } = await params;
  await prisma.blogPost.delete({ where: { id } }).catch(() => {});
  return NextResponse.json({ ok: true });
}
