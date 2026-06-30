import { requireSuperAdmin } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { BlogAdminActions } from "@/components/app/BlogAdminActions";

export const dynamic = "force-dynamic";

export default async function AdminBlogPage() {
  await requireSuperAdmin();
  const posts = await prisma.blogPost.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
        <div>
          <Link href="/dashboard/admin" style={{ color: "var(--muted)", textDecoration: "none", fontSize: 13 }}>← Супер Админ</Link>
          <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 24, fontWeight: 600, margin: "4px 0 0" }}>Блог ({posts.length})</h1>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <BlogAdminActions hasPosts={posts.length > 0} />
          <Link href="/dashboard/admin/blog/new" className="btn btn-primary btn-sm">+ Нова статия</Link>
        </div>
      </div>

      <div className="glass panel" style={{ padding: "8px 0" }}>
        {posts.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 0", color: "var(--muted)" }}>
            Няма статии. Натиснете „Зареди 10 SEO статии“ или създайте нова.
          </div>
        ) : (
          <table>
            <thead><tr><th>Заглавие</th><th>Категория</th><th>Статус</th><th className="num">Прегледи</th><th>Дата</th><th></th></tr></thead>
            <tbody>
              {posts.map((p) => (
                <tr key={p.id}>
                  <td style={{ fontWeight: 600 }}>{p.title}<div style={{ fontSize: 11.5, color: "var(--muted)" }}>/blog/{p.slug}</div></td>
                  <td style={{ fontSize: 12.5 }}>{p.category ?? "—"}</td>
                  <td><span style={{ fontSize: 11.5, fontWeight: 700, color: p.published ? "var(--emerald-dark)" : "var(--muted)" }}>{p.published ? "Публикувана" : "Чернова"}</span></td>
                  <td className="num">{p.views}</td>
                  <td style={{ fontSize: 12, color: "var(--muted)" }}>{new Date(p.createdAt).toLocaleDateString("bg-BG")}</td>
                  <td style={{ display: "flex", gap: 6 }}>
                    {p.published && <a href={`/blog/${p.slug}`} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm">👁</a>}
                    <Link href={`/dashboard/admin/blog/${p.id}`} className="btn btn-ghost btn-sm">✎ Редактирай</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
