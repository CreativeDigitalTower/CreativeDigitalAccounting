import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { PLATFORM_NAME } from "@/lib/constants";
import { safeJsonLd } from "@/lib/jsonLd";
import { getT } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

const BASE = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.creativedigitalaccounting.com";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = await prisma.blogPost.findUnique({ where: { slug } });
  if (!post || post.status !== "published") { const { t } = await getT(); return { title: t("blogpublic.notFound") }; }
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
  const { t, locale } = await getT();
  const { slug } = await params;
  const post = await prisma.blogPost.findUnique({ where: { slug } });
  if (!post || post.status !== "published") notFound();

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
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }} />
      <Link href="/blog" style={{ color: "var(--muted)", textDecoration: "none", fontSize: 13 }}>{t("blogpublic.back")}</Link>
      {post.category && <div style={{ fontSize: 12, fontWeight: 700, color: "var(--brass)", textTransform: "uppercase", letterSpacing: 1, margin: "18px 0 8px" }}>{post.category}</div>}
      <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 34, fontWeight: 700, margin: "0 0 12px", lineHeight: 1.2 }}>{post.title}</h1>
      <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 24 }}>
        {post.author} · {post.publishedAt ? new Date(post.publishedAt).toLocaleDateString(locale) : ""}
      </div>
      {post.coverImage && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={post.coverImage} alt={post.title} style={{ width: "100%", borderRadius: 14, marginBottom: 28, objectFit: "cover" }} />
      )}
      <style>{`
        .blog-content img { max-width: 100%; height: auto; border-radius: 10px; margin: 14px 0; }
        .blog-content h2 { font-family: 'Fraunces', serif; font-size: 26px; margin: 28px 0 10px; line-height: 1.25; }
        .blog-content h3 { font-family: 'Fraunces', serif; font-size: 21px; margin: 22px 0 8px; }
        .blog-content p { margin: 0 0 14px; }
        .blog-content ul, .blog-content ol { padding-left: 24px; margin: 10px 0 16px; }
        .blog-content li { margin-bottom: 6px; }
        .blog-content blockquote { border-left: 3px solid var(--emerald); margin: 16px 0; padding: 8px 18px; background: rgba(15,138,106,.05); border-radius: 8px; color: var(--ink-soft); }
        .blog-content a { color: var(--emerald-dark); }
        .blog-content iframe { max-width: 100%; }
      `}</style>
      <div className="blog-content" style={{ fontSize: 16.5, lineHeight: 1.75, color: "var(--ink)" }} dangerouslySetInnerHTML={{ __html: post.content }} />

      <div className="glass panel" style={{ marginTop: 40, padding: "26px 28px", textAlign: "center" }}>
        <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 20, margin: "0 0 8px" }}>{t("blogpublic.ctaTitle")}</h3>
        <p style={{ fontSize: 14, color: "var(--ink-soft)", margin: "0 0 16px" }}>{t("blogpublic.ctaText", { name: PLATFORM_NAME })}</p>
        <Link href="/register" className="btn btn-primary">{t("blogpublic.ctaButton")}</Link>
      </div>
    </article>
  );
}
