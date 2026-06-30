import { requireSuperAdmin } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { BlogEditor } from "@/components/app/BlogEditor";

export default async function EditBlogPostPage({ params }: { params: Promise<{ id: string }> }) {
  await requireSuperAdmin();
  const { id } = await params;
  const post = await prisma.blogPost.findUnique({ where: { id } });
  if (!post) notFound();
  return <BlogEditor post={{
    id: post.id, slug: post.slug, title: post.title, excerpt: post.excerpt, content: post.content,
    coverImage: post.coverImage, author: post.author, category: post.category, tags: post.tags,
    metaTitle: post.metaTitle, metaDescription: post.metaDescription, keywords: post.keywords,
    status: post.status, publishedAt: post.publishedAt?.toISOString() ?? null,
  }} />;
}
