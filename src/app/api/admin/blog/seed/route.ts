import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/session";
import { BLOG_SEED } from "@/lib/blog/seed";

// Вмъква 10-те начални статии (idempotent — пропуска вече съществуващите slug-ове).
export async function POST() {
  await requireSuperAdmin();
  let created = 0;
  for (const p of BLOG_SEED) {
    const exists = await prisma.blogPost.findUnique({ where: { slug: p.slug } });
    if (exists) continue;
    await prisma.blogPost.create({
      data: {
        slug: p.slug, title: p.title, excerpt: p.excerpt, content: p.content, category: p.category, tags: p.tags,
        metaTitle: p.metaTitle, metaDescription: p.metaDescription, keywords: p.keywords,
        published: true, publishedAt: new Date(),
      },
    });
    created++;
  }
  return NextResponse.json({ ok: true, created, total: BLOG_SEED.length });
}
