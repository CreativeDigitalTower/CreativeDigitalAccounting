import { requireFeature } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { formatCurrency } from "@/lib/constants";
import { NavIcon, UiIcon } from "@/components/app/NavIcons";
import { getT } from "@/lib/i18n/server";

export default async function ProjectsPage() {
  const { companyId } = await requireFeature("projects");
  const { t, locale } = await getT();

  const projects = await prisma.project.findMany({
    where: { companyId, parentProjectId: null },
    include: { client: true, _count: { select: { entries: true, subProjects: true } } },
    orderBy: { progressPercent: "desc" },
  });

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 25, fontWeight: 600, margin: "0 0 3px" }}>{t("projects.title")}</h1>
          <div style={{ color: "var(--muted)", fontSize: 13 }}>{t("projects.count", { n: projects.length })}</div>
        </div>
        <Link href="/dashboard/projects/new" className="btn btn-primary">{t("projects.newProject")}</Link>
      </div>

      {projects.length === 0 ? (
        <div className="glass panel" style={{ textAlign: "center", padding: "48px 0" }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 12, color: "var(--muted)" }}><NavIcon.projects width={34} height={34} /></div>
          <div style={{ fontSize: 14, color: "var(--muted)", marginBottom: 16 }}>{t("projects.empty.none")}</div>
          <Link href="/dashboard/projects/new" className="btn btn-primary btn-sm">{t("projects.empty.add")}</Link>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 14 }}>
          {projects.map((p) => (
            <div key={p.id} className="glass panel" style={{ padding: "18px 22px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                    <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 17, margin: 0 }}>{p.name}</h3>
                    <span style={{ fontSize: 11.5, fontWeight: 600, color: p.status === "active" ? "var(--emerald)" : "var(--muted)", background: p.status === "active" ? "var(--emerald-soft)" : "rgba(0,0,0,.05)", borderRadius: 20, padding: "2px 9px" }}>
                      {t(`projects.status.${p.status}`)}
                    </span>
                  </div>
                  {p.client && <div style={{ fontSize: 13, color: "var(--ink-soft)", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}><UiIcon.people width={13} height={13} /> {p.client.name}</div>}

                  {/* Progress bar */}
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ flex: 1, height: 6, background: "rgba(217,215,200,.5)", borderRadius: 4, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${p.progressPercent}%`, background: "var(--emerald)", borderRadius: 4 }} />
                    </div>
                    <span className="num" style={{ fontSize: 12, color: "var(--muted)", minWidth: 32 }}>{p.progressPercent}%</span>
                  </div>
                </div>

                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  {p.budget != null && (
                    <div>
                      <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 2 }}>{t("projects.budget")}</div>
                      <div className="num" style={{ fontSize: 15, fontWeight: 600 }}>{formatCurrency(p.budget)}</div>
                    </div>
                  )}
                  {p.deadline && (
                    <div style={{ marginTop: 6 }}>
                      <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 2 }}>{t("projects.deadline")}</div>
                      <div style={{ fontSize: 13, color: new Date(p.deadline) < new Date() ? "var(--brick)" : "var(--ink-soft)" }}>
                        {new Date(p.deadline).toLocaleDateString(locale)}
                      </div>
                    </div>
                  )}
                  <Link href={`/dashboard/projects/${p.id}`} className="btn btn-ghost btn-sm" style={{ marginTop: 10 }}>
                    {t("projects.details")}
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
