"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { RichTextEditor } from "@/components/app/RichTextEditor";
import { useT } from "@/components/i18n/I18nProvider";

type Post = {
  id?: string; slug?: string; title: string; excerpt: string | null; content: string; coverImage: string | null;
  author: string; category: string | null; tags: string | null; metaTitle: string | null;
  metaDescription: string | null; keywords: string | null; status: string; publishedAt: string | null;
};

const EMPTY: Post = {
  title: "", excerpt: "", content: "", coverImage: null, author: "Екипът на Creative Digital Accounting",
  category: "", tags: "", metaTitle: "", metaDescription: "", keywords: "", status: "draft", publishedAt: null,
};

const STATUSES = [
  { id: "draft", key: "stDraft", color: "var(--muted)" },
  { id: "published", key: "stPublished", color: "var(--emerald-dark)" },
  { id: "hidden", key: "stHidden", color: "var(--brass)" },
];

export function BlogEditor({ post }: { post?: Post }) {
  const t = useT();
  const router = useRouter();
  const [f, setF] = useState<Post>(post ?? EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function set<K extends keyof Post>(k: K, v: Post[K]) { setF((p) => ({ ...p, [k]: v })); }

  async function uploadCover(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; e.target.value = "";
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) { setError(t("blog.errCover")); return; }
    const dataUrl = await new Promise<string>((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result as string); r.onerror = rej; r.readAsDataURL(file); });
    set("coverImage", dataUrl);
  }

  async function save(status?: string) {
    setError("");
    if (!f.title.trim()) { setError(t("blog.errTitle")); return; }
    setBusy(true);
    const payload = { ...f, status: status ?? f.status };
    const url = post?.id ? `/api/admin/blog/${post.id}` : "/api/admin/blog";
    const res = await fetch(url, { method: post?.id ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    setBusy(false);
    if (res.ok) router.push("/dashboard/admin/blog");
    else setError((await res.json()).error ?? t("blog.errSave"));
  }

  const lbl = { fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 } as React.CSSProperties;

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18, flexWrap: "wrap" }}>
        <Link href="/dashboard/admin/blog" style={{ color: "var(--muted)", textDecoration: "none", fontSize: 13 }}>{t("blog.back")}</Link>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 600, margin: 0 }}>{post?.id ? t("blog.editTitle") : t("blog.newTitle")}</h1>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <button className="btn btn-ghost btn-sm" disabled={busy} onClick={() => save()}>{t("blog.save")}</button>
          <button className="btn btn-primary btn-sm" disabled={busy} onClick={() => save("published")}>{busy ? t("blog.saving") : t("blog.publish")}</button>
        </div>
      </div>

      {error && <div style={{ background: "var(--brick-soft)", color: "var(--brick)", borderRadius: 8, padding: "10px 14px", fontSize: 13, marginBottom: 14 }}>{error}</div>}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 16, alignItems: "start" }}>
        {/* Основно */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="glass panel" style={{ padding: 20 }}>
            <label style={lbl}>{t("blog.lTitle")}</label>
            <input value={f.title} onChange={(e) => set("title", e.target.value)} placeholder={t("blog.titlePh")} style={{ marginBottom: 12 }} />
            <label style={lbl}>{t("blog.lExcerpt")}</label>
            <textarea value={f.excerpt ?? ""} onChange={(e) => set("excerpt", e.target.value)} rows={2} style={{ width: "100%", marginBottom: 12 }} />

            <label style={lbl}>{t("blog.lContent")}</label>
            <RichTextEditor value={f.content} onChange={(html) => set("content", html)} />
          </div>

          {/* SEO */}
          <div className="glass panel" style={{ padding: 20 }}>
            <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 15, margin: "0 0 12px" }}>{t("blog.seoTitle")}</h3>
            <label style={lbl}>{t("blog.lMetaTitle")}</label>
            <input value={f.metaTitle ?? ""} onChange={(e) => set("metaTitle", e.target.value)} placeholder={t("blog.metaTitlePh")} style={{ marginBottom: 12 }} />
            <label style={lbl}>{t("blog.lMetaDesc")}</label>
            <textarea value={f.metaDescription ?? ""} onChange={(e) => set("metaDescription", e.target.value)} rows={2} style={{ width: "100%", marginBottom: 12 }} placeholder={t("blog.metaDescPh")} />
            <label style={lbl}>{t("blog.lKeywords")}</label>
            <input value={f.keywords ?? ""} onChange={(e) => set("keywords", e.target.value)} placeholder={t("blog.keywordsPh")} />
          </div>
        </div>

        {/* Странична колона */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Статус и публикуване */}
          <div className="glass panel" style={{ padding: 18 }}>
            <label style={lbl}>{t("blog.lStatus")}</label>
            <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
              {STATUSES.map((s) => (
                <button key={s.id} type="button" onClick={() => set("status", s.id)}
                  className={`filter-tab${f.status === s.id ? " active" : ""}`} style={{ fontSize: 12 }}>
                  {t(`blog.${s.key}`)}
                </button>
              ))}
            </div>
            <div style={{ fontSize: 11.5, color: "var(--muted)", marginBottom: 12 }}>
              {f.status === "published" ? t("blog.statusPublished") : f.status === "hidden" ? t("blog.statusHidden") : t("blog.statusDraft")}
            </div>
            <label style={lbl}>{t("blog.lPubDate")}</label>
            <input type="date" value={f.publishedAt?.slice(0, 10) ?? ""} onChange={(e) => set("publishedAt", e.target.value || null)} />
            <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>{t("blog.pubDateNote")}</div>
          </div>

          <div className="glass panel" style={{ padding: 18 }}>
            <label style={lbl}>{t("blog.lCover")}</label>
            {f.coverImage && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={f.coverImage} alt="" style={{ width: "100%", borderRadius: 10, marginBottom: 8, objectFit: "cover", maxHeight: 160 }} />
            )}
            <input type="file" accept="image/png,image/jpeg,image/webp" onChange={uploadCover} style={{ fontSize: 12.5, marginBottom: 6 }} />
            <input value={f.coverImage ?? ""} onChange={(e) => set("coverImage", e.target.value)} placeholder={t("blog.coverUrlPh")} style={{ fontSize: 12 }} />
            <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 6, lineHeight: 1.5 }} dangerouslySetInnerHTML={{ __html: t("blog.coverNote") }} />
            {f.coverImage && <button type="button" className="btn btn-ghost btn-sm" style={{ marginTop: 8 }} onClick={() => set("coverImage", null)}>{t("blog.coverRemove")}</button>}
          </div>

          <div className="glass panel" style={{ padding: 18 }}>
            <label style={lbl}>{t("blog.lCategory")}</label>
            <input value={f.category ?? ""} onChange={(e) => set("category", e.target.value)} placeholder={t("blog.categoryPh")} style={{ marginBottom: 12 }} />
            <label style={lbl}>{t("blog.lTags")}</label>
            <input value={f.tags ?? ""} onChange={(e) => set("tags", e.target.value)} style={{ marginBottom: 12 }} />
            <label style={lbl}>{t("blog.lAuthor")}</label>
            <input value={f.author} onChange={(e) => set("author", e.target.value)} style={{ marginBottom: 12 }} />
            <label style={lbl}>{t("blog.lSlug")}</label>
            <input value={f.slug ?? ""} onChange={(e) => set("slug", e.target.value)} placeholder={t("blog.slugPh")} />
          </div>
        </div>
      </div>
    </>
  );
}
