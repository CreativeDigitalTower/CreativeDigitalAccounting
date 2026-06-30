import { prisma } from "@/lib/prisma";
import Link from "next/link";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Блог — онлайн фактуриране, електронно счетоводство и CRM | Creative Digital Accounting",
  description: "Статии и ръководства за онлайн фактуриране, софтуер за фактури, електронно счетоводство, CRM и ERP платформа за българския бизнес.",
  keywords: ["онлайн фактуриране", "софтуер за фактури", "електронно счетоводство", "CRM платформа", "ERP платформа"],
  alternates: { canonical: "/blog" },
};

export default async function BlogIndex() {
  const posts = await prisma.blogPost.findMany({
    where: { published: true },
    orderBy: { publishedAt: "desc" },
    select: { slug: true, title: true, excerpt: true, coverImage: true, category: true, publishedAt: true },
  });

  return (
    <div style={{ maxWidth: 1080, margin: "0 auto", padding: "48px 20px" }}>
      <header style={{ textAlign: "center", marginBottom: 40 }}>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 38, fontWeight: 700, margin: "0 0 10px" }}>Блог</h1>
        <p style={{ color: "var(--muted)", fontSize: 16, maxWidth: 620, margin: "0 auto" }}>
          Практични ръководства за онлайн фактуриране, електронно счетоводство, CRM и управление на бизнеса.
        </p>
      </header>

      {posts.length === 0 ? (
        <p style={{ textAlign: "center", color: "var(--muted)" }}>Скоро очаквайте първите статии.</p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 24 }}>
          {posts.map((p) => (
            <Link key={p.slug} href={`/blog/${p.slug}`} className="glass panel" style={{ textDecoration: "none", color: "inherit", overflow: "hidden", display: "flex", flexDirection: "column", padding: 0 }}>
              <div style={{ height: 170, background: p.coverImage ? `center/cover no-repeat url(${p.coverImage})` : "linear-gradient(135deg, var(--emerald), var(--navy))" }} />
              <div style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
                {p.category && <span style={{ fontSize: 11, fontWeight: 700, color: "var(--brass)", textTransform: "uppercase", letterSpacing: 1 }}>{p.category}</span>}
                <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 18, fontWeight: 600, margin: 0, lineHeight: 1.3 }}>{p.title}</h2>
                {p.excerpt && <p style={{ fontSize: 13.5, color: "var(--ink-soft)", margin: 0, lineHeight: 1.55 }}>{p.excerpt}</p>}
                <span style={{ fontSize: 12, color: "var(--muted)", marginTop: "auto" }}>{p.publishedAt ? new Date(p.publishedAt).toLocaleDateString("bg-BG") : ""}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
