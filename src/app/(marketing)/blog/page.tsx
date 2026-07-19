import { prisma } from "@/lib/prisma";
import Link from "next/link";
import type { Metadata } from "next";
import { getT, getLocale } from "@/lib/i18n/server";
import { getMessages } from "@/lib/i18n/messages";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const bp = (getMessages(locale) as Record<string, Record<string, unknown>>).blogpublic ?? {};
  return {
    title: (bp.metaTitle as string) ?? "Blog",
    description: bp.metaDescription as string,
    keywords: Array.isArray(bp.metaKeywords) ? (bp.metaKeywords as string[]) : undefined,
    alternates: { canonical: "/blog" },
  };
}

export default async function BlogIndex() {
  const { t, locale } = await getT();
  const posts = await prisma.blogPost.findMany({
    where: { status: "published" },
    orderBy: { publishedAt: "desc" },
    select: { slug: true, title: true, excerpt: true, coverImage: true, category: true, publishedAt: true },
  });

  return (
    <div style={{ maxWidth: 1080, margin: "0 auto", padding: "48px 20px" }}>
      <header style={{ textAlign: "center", marginBottom: 40 }}>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 38, fontWeight: 700, margin: "0 0 10px" }}>{t("blogpublic.heading")}</h1>
        <p style={{ color: "var(--muted)", fontSize: 16, maxWidth: 620, margin: "0 auto" }}>
          {t("blogpublic.subtitle")}
        </p>
      </header>

      {posts.length === 0 ? (
        <p style={{ textAlign: "center", color: "var(--muted)" }}>{t("blogpublic.empty")}</p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 24 }}>
          {posts.map((p) => (
            <Link key={p.slug} href={`/blog/${p.slug}`} className="glass panel" style={{ textDecoration: "none", color: "inherit", overflow: "hidden", display: "flex", flexDirection: "column", padding: 0 }}>
              <div style={{ height: 170, background: p.coverImage ? `center/cover no-repeat url(${p.coverImage})` : "linear-gradient(135deg, var(--emerald), var(--navy))" }} />
              <div style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
                {p.category && <span style={{ fontSize: 11, fontWeight: 700, color: "var(--brass)", textTransform: "uppercase", letterSpacing: 1 }}>{p.category}</span>}
                <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 18, fontWeight: 600, margin: 0, lineHeight: 1.3 }}>{p.title}</h2>
                {p.excerpt && <p style={{ fontSize: 13.5, color: "var(--ink-soft)", margin: 0, lineHeight: 1.55 }}>{p.excerpt}</p>}
                <span style={{ fontSize: 12, color: "var(--muted)", marginTop: "auto" }}>{p.publishedAt ? new Date(p.publishedAt).toLocaleDateString(locale) : ""}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
