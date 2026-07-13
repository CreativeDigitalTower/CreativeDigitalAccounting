import { requireFeature } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getT } from "@/lib/i18n/server";

export default async function AuditPage() {
  const { companyId } = await requireFeature("audit");
  const { t, locale } = await getT();
  const actionLabel = (a: string) => { const l = t(`modules.audit.action.${a}`); return l.startsWith("modules.") ? a : l; };
  const entityLabel = (e: string) => { const l = t(`modules.audit.entity.${e}`); return l.startsWith("modules.") ? e : l; };

  const logs = await prisma.auditLog.findMany({
    where: { companyId },
    include: { user: { select: { name: true, email: true } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 25, fontWeight: 600, margin: "0 0 3px" }}>{t("modules.audit.title")}</h1>
        <div style={{ color: "var(--muted)", fontSize: 13 }}>{t("modules.audit.subtitle", { n: logs.length })}</div>
      </div>

      <div className="glass panel" style={{ padding: "8px 0" }}>
        {logs.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px 0", color: "var(--muted)" }}>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 12, color: "var(--muted)" }}><svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2.5h8l4 4V21a.5.5 0 0 1-.5.5h-11A.5.5 0 0 1 6 21V2.5Z"/><path d="M14 2.5v4h4M9 11h6M9 14.5h6M9 18h3"/></svg></div>
            <div style={{ fontSize: 14 }}>{t("modules.audit.empty")}</div>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>{t("modules.audit.th.datetime")}</th>
                <th>{t("modules.audit.th.user")}</th>
                <th>{t("modules.audit.th.action")}</th>
                <th>{t("modules.audit.th.entity")}</th>
                <th>{t("modules.audit.th.details")}</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td className="num" style={{ fontSize: 12, color: "var(--ink-soft)" }}>
                    {new Date(log.createdAt).toLocaleString(locale)}
                  </td>
                  <td style={{ fontSize: 13 }}>{log.user?.name ?? log.user?.email ?? t("modules.audit.system")}</td>
                  <td>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "var(--navy)" }}>
                      {actionLabel(log.action)}
                    </span>
                  </td>
                  <td style={{ fontSize: 13 }}>{entityLabel(log.entity)}</td>
                  <td style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>{log.summary ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
