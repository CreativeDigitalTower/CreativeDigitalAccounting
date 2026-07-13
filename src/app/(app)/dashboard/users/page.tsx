import { requireFeature } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { UserRowActions } from "@/components/app/UserRowActions";
import { getT } from "@/lib/i18n/server";

const ROLE_KEYS = ["owner", "manager", "accountant", "sales", "warehouse", "viewer", "employee"];
const MODULE_KEYS = ["documents", "clients", "warehouse", "expenses", "analytics", "projects", "contracts", "assets", "users", "subscription"];
const ROLE_PERMS: Record<string, string[]> = {
  owner: ["all"],
  manager: ["documents", "clients", "expenses", "projects", "analytics"],
  accountant: ["documents", "expenses", "analytics", "assets"],
  sales: ["documents", "clients"],
  warehouse: ["warehouse"],
  viewer: [],
  employee: [],
};

export default async function UsersPage() {
  const { companyId, userId } = await requireFeature("users");
  const { t } = await getT();

  const companyUsers = await prisma.companyUser.findMany({
    where: { companyId },
    include: { user: true },
    orderBy: { role: "asc" },
  });

  const myRole = companyUsers.find((cu) => cu.userId === userId)?.role;
  const canManage = myRole === "owner" || myRole === "manager";

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 25, fontWeight: 600, margin: "0 0 3px" }}>{t("account.users.title")}</h1>
          <div style={{ color: "var(--muted)", fontSize: 13 }}>{t("account.users.count", { n: companyUsers.length })}</div>
        </div>
        {canManage && (
          <Link href="/dashboard/users/invite" className="btn btn-primary">{t("account.users.invite")}</Link>
        )}
      </div>

      {/* Permissions matrix */}
      <div className="glass panel" style={{ marginBottom: 18, padding: "20px 24px", overflowX: "auto" }}>
        <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 15, margin: "0 0 14px" }}>{t("account.users.matrixTitle")}</h3>
        <table style={{ fontSize: 12.5 }}>
          <thead>
            <tr>
              <th style={{ minWidth: 130 }}>{t("account.users.roleCol")}</th>
              {MODULE_KEYS.map((m) => (
                <th key={m} style={{ textAlign: "center", minWidth: 70 }}>{t(`account.users.modules.${m}`)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROLE_KEYS.map((role) => {
              const perms = ROLE_PERMS[role] ?? [];
              const hasAll = perms.includes("all");
              return (
                <tr key={role}>
                  <td>
                    <span style={{ fontWeight: 600, fontSize: 13 }}>{t(`account.users.roles.${role}`)}</span>
                  </td>
                  {MODULE_KEYS.map((m) => (
                    <td key={m} style={{ textAlign: "center" }}>
                      {hasAll || perms.includes(m) ? (
                        <span style={{ color: "var(--emerald)", fontWeight: 700 }}>✓</span>
                      ) : (
                        <span style={{ color: "rgba(116,120,110,.3)" }}>—</span>
                      )}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Users list */}
      <div className="glass panel" style={{ padding: "8px 0" }}>
        <table>
          <thead>
            <tr>
              <th>{t("account.users.th.user")}</th>
              <th>{t("account.users.th.email")}</th>
              <th>{t("account.users.th.role")}</th>
              {canManage && <th></th>}
            </tr>
          </thead>
          <tbody>
            {companyUsers.map((cu) => (
              <tr key={cu.userId}>
                <td>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--navy-soft)", color: "var(--navy)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                      {(cu.user.name ?? cu.user.email).slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13.5 }}>{cu.user.name ?? "—"}</div>
                      {cu.userId === userId && <div style={{ fontSize: 11, color: "var(--emerald)", fontWeight: 600 }}>{t("account.users.you")}</div>}
                    </div>
                  </div>
                </td>
                <td style={{ color: "var(--ink-soft)", fontSize: 13 }}>{cu.user.email}</td>
                <td>
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: cu.role === "owner" ? "var(--brass)" : "var(--navy)", background: cu.role === "owner" ? "var(--brass-soft)" : "var(--navy-soft)", borderRadius: 20, padding: "3px 10px" }}>
                    {t(`account.users.roles.${cu.role}`)}
                  </span>
                </td>
                {canManage && (
                  <td>
                    {cu.userId !== userId ? (
                      <UserRowActions targetUserId={cu.userId} role={cu.role} canManageOwner={myRole === "owner"} />
                    ) : (
                      <span style={{ fontSize: 11.5, color: "var(--muted)" }}>{t("account.users.none")}</span>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
