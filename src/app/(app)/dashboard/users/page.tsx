import { requireFeature } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { UserRowActions } from "@/components/app/UserRowActions";

const ROLE_LABELS: Record<string, string> = {
  owner: "Собственик",
  manager: "Мениджър",
  accountant: "Счетоводител",
  sales: "Продажби",
  warehouse: "Склад",
  viewer: "Преглед",
};

const ROLE_PERMISSIONS: Record<string, string[]> = {
  owner: ["Всички права", "Абонамент", "Потребители"],
  manager: ["Документи", "Клиенти", "Разходи", "Проекти", "Анализи"],
  accountant: ["Документи", "Разходи", "Анализи", "Активи"],
  sales: ["Документи", "Клиенти", "Оферти"],
  warehouse: ["Склад", "Доставчици"],
  viewer: ["Само преглед"],
};

export default async function UsersPage() {
  const { companyId, userId } = await requireFeature("users");

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
          <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 25, fontWeight: 600, margin: "0 0 3px" }}>Потребители и Роли</h1>
          <div style={{ color: "var(--muted)", fontSize: 13 }}>{companyUsers.length} потребители</div>
        </div>
        {canManage && (
          <Link href="/dashboard/users/invite" className="btn btn-primary">+ Покани потребител</Link>
        )}
      </div>

      {/* Permissions matrix */}
      <div className="glass panel" style={{ marginBottom: 18, padding: "20px 24px", overflowX: "auto" }}>
        <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 15, margin: "0 0 14px" }}>Матрица на правата</h3>
        <table style={{ fontSize: 12.5 }}>
          <thead>
            <tr>
              <th style={{ minWidth: 130 }}>Роля</th>
              {["Документи", "Клиенти", "Склад", "Разходи", "Анализи", "Проекти", "Договори", "Активи", "Потребители", "Абонамент"].map((m) => (
                <th key={m} style={{ textAlign: "center", minWidth: 70 }}>{m}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Object.entries(ROLE_LABELS).map(([role, label]) => {
              const perms = ROLE_PERMISSIONS[role] ?? [];
              const hasAll = perms.includes("Всички права");
              return (
                <tr key={role}>
                  <td>
                    <span style={{ fontWeight: 600, fontSize: 13 }}>{label}</span>
                  </td>
                  {["Документи", "Клиенти", "Склад", "Разходи", "Анализи", "Проекти", "Договори", "Активи", "Потребители", "Абонамент"].map((m) => (
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
              <th>Потребител</th>
              <th>Имейл</th>
              <th>Роля</th>
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
                      {cu.userId === userId && <div style={{ fontSize: 11, color: "var(--emerald)", fontWeight: 600 }}>▸ Вие</div>}
                    </div>
                  </div>
                </td>
                <td style={{ color: "var(--ink-soft)", fontSize: 13 }}>{cu.user.email}</td>
                <td>
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: cu.role === "owner" ? "var(--brass)" : "var(--navy)", background: cu.role === "owner" ? "var(--brass-soft)" : "var(--navy-soft)", borderRadius: 20, padding: "3px 10px" }}>
                    {ROLE_LABELS[cu.role]}
                  </span>
                </td>
                {canManage && (
                  <td>
                    {cu.userId !== userId ? (
                      <UserRowActions targetUserId={cu.userId} role={cu.role} canManageOwner={myRole === "owner"} />
                    ) : (
                      <span style={{ fontSize: 11.5, color: "var(--muted)" }}>—</span>
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
