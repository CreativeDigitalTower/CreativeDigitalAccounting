import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/session";
import { slugify } from "@/lib/blog/slug";
import { z } from "zod";

const schema = z.object({
  title: z.string().min(2),
  slug: z.string().optional(),
  excerpt: z.string().optional().nullable(),
  content: z.string().default(""),
  coverImage: z.string().optional().nullable(),
  author: z.string().optional(),
  category: z.string().optional().nullable(),
  tags: z.string().optional().nullable(),
  metaTitle: z.string().optional().nullable(),
  metaDescription: z.string().optional().nullable(),
  keywords: z.string().optional().nullable(),
  status: z.enum(["draft", "published", "hidden"]).default("draft"),
  publishedAt: z.string().optional().nullable(),
});

export async function GET() {
  await requireSuperAdmin();
  const posts = await prisma.blogPost.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json(posts);
}

export async function POST(req: Request) {
  await requireSuperAdmin();
  try {
    const d = schema.parse(await req.json());
    let slug = d.slug?.trim() ? slugify(d.slug) : slugify(d.title);
    // уникален slug
    let n = 1; const baseSlug = slug;
    while (await prisma.blogPost.findUnique({ where: { slug } })) slug = `${baseSlug}-${++n}`;
    const post = await prisma.blogPost.create({
      data: {
        slug, title: d.title, excerpt: d.excerpt ?? null, content: d.content, coverImage: d.coverImage ?? null,
        author: d.author || undefined, category: d.category ?? null, tags: d.tags ?? null,
        metaTitle: d.metaTitle ?? null, metaDescription: d.metaDescription ?? null, keywords: d.keywords ?? null,
        status: d.status, published: d.status === "published",
        publishedAt: d.publishedAt ? new Date(d.publishedAt) : (d.status === "published" ? new Date() : null),
      },
    });
    return NextResponse.json(post);
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Невалидни данни" }, { status: 400 });
    return NextResponse.json({ error: "Сървърна грешка" }, { status: 500 });
  }
}
