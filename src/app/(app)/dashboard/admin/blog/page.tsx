import { requireSuperAdmin } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { BlogAdminActions } from "@/components/app/BlogAdminActions";
import { getT } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export default async function AdminBlogPage() {
  await requireSuperAdmin();
  const { t, locale } = await getT();
  const posts = await prisma.blogPost.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
        <div>
          <Link href="/dashboard/admin" style={{ color: "var(--muted)", textDecoration: "none", fontSize: 13 }}>{t("admin.backToAdmin")}</Link>
          <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 24, fontWeight: 600, margin: "4px 0 0" }}>{t("admin.blog.title", { n: posts.length })}</h1>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <BlogAdminActions hasPosts={posts.length > 0} />
          <Link href="/dashboard/admin/blog/new" className="btn btn-primary btn-sm">{t("admin.blog.new")}</Link>
        </div>
      </div>

      <div className="glass panel" style={{ padding: "8px 0" }}>
        {posts.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 0", color: "var(--muted)" }}>
            {t("admin.blog.empty")}
          </div>
        ) : (
          <table>
            <thead><tr><th>{t("admin.blog.thTitle")}</th><th>{t("admin.blog.thCategory")}</th><th>{t("admin.blog.thStatus")}</th><th className="num">{t("admin.blog.thViews")}</th><th>{t("admin.blog.thDate")}</th><th></th></tr></thead>
            <tbody>
              {posts.map((p) => (
                <tr key={p.id}>
                  <td style={{ fontWeight: 600 }}>{p.title}<div style={{ fontSize: 11.5, color: "var(--muted)" }}>/blog/{p.slug}</div></td>
                  <td style={{ fontSize: 12.5 }}>{p.category ?? t("admin.blog.dash")}</td>
                  <td><span style={{ fontSize: 11.5, fontWeight: 700, color: p.status === "published" ? "var(--emerald-dark)" : p.status === "hidden" ? "var(--brass)" : "var(--muted)" }}>{p.status === "published" ? t("admin.blog.status.published") : p.status === "hidden" ? t("admin.blog.status.hidden") : t("admin.blog.status.draft")}</span></td>
                  <td className="num">{p.views}</td>
                  <td style={{ fontSize: 12, color: "var(--muted)" }}>{new Date(p.createdAt).toLocaleDateString(locale)}</td>
                  <td style={{ display: "flex", gap: 6 }}>
                    {p.status === "published" && <a href={`/blog/${p.slug}`} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm" style={{display:"inline-flex",alignItems:"center"}}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg></a>}
                    <Link href={`/dashboard/admin/blog/${p.id}`} className="btn btn-ghost btn-sm">{t("admin.blog.edit")}</Link>
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
