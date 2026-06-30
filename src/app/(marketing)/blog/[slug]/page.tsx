import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { PLATFORM_NAME } from "@/lib/constants";

export const dynamic = "force-dynamic";

const BASE = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.creativedigitalaccounting.com";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = await prisma.blogPost.findUnique({ where: { slug } });
  if (!post || !post.published) return { title: "Статия не е намерена" };
  const title = post.metaTitle || post.title;
  const description = post.metaDescription || post.excerpt || undefined;
  return {
    title: `${title} | ${PLATFORM_NAME}`,
    description,
    keywords: post.keywords ? post.keywords.split(",").map((k) => k.trim()) : undefined,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      title, description, type: "article",
      url: `${BASE}/blog/${post.slug}`,
      images: post.coverImage ? [post.coverImage] : undefined,
      publishedTime: post.publishedAt?.toISOString(),
    },
    twitter: { card: "summary_large_image", title, description, images: post.coverImage ? [post.coverImage] : undefined },
  };
}

export default async function BlogArticle({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await prisma.blogPost.findUnique({ where: { slug } });
  if (!post || !post.published) notFound();

  // увеличаваме броя прегледи (best-effort)
  prisma.blogPost.update({ where: { id: post.id }, data: { views: { increment: 1 } } }).catch(() => {});

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.metaDescription || post.excerpt || undefined,
    image: post.coverImage || undefined,
    author: { "@type": "Organization", name: post.author },
    publisher: { "@type": "Organization", name: PLATFORM_NAME },
    datePublished: post.publishedAt?.toISOString(),
    dateModified: post.updatedAt.toISOString(),
    mainEntityOfPage: `${BASE}/blog/${post.slug}`,
  };

  return (
    <article style={{ maxWidth: 760, margin: "0 auto", padding: "40px 20px" }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Link href="/blog" style={{ color: "var(--muted)", textDecoration: "none", fontSize: 13 }}>← Всички статии</Link>
      {post.category && <div style={{ fontSize: 12, fontWeight: 700, color: "var(--brass)", textTransform: "uppercase", letterSpacing: 1, margin: "18px 0 8px" }}>{post.category}</div>}
      <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 34, fontWeight: 700, margin: "0 0 12px", lineHeight: 1.2 }}>{post.title}</h1>
      <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 24 }}>
        {post.author} · {post.publishedAt ? new Date(post.publishedAt).toLocaleDateString("bg-BG") : ""}
      </div>
      {post.coverImage && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={post.coverImage} alt={post.title} style={{ width: "100%", borderRadius: 14, marginBottom: 28, objectFit: "cover" }} />
      )}
      <div className="blog-content" style={{ fontSize: 16.5, lineHeight: 1.75, color: "var(--ink)" }} dangerouslySetInnerHTML={{ __html: post.content }} />

      <div className="glass panel" style={{ marginTop: 40, padding: "26px 28px", textAlign: "center" }}>
        <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 20, margin: "0 0 8px" }}>Издавайте фактури онлайн още днес</h3>
        <p style={{ fontSize: 14, color: "var(--ink-soft)", margin: "0 0 16px" }}>Започнете безплатно с {PLATFORM_NAME} — фактури, CRM, склад и счетоводство на едно място.</p>
        <Link href="/register" className="btn btn-primary">Създай безплатен акаунт</Link>
      </div>
    </article>
  );
}
