import { requireProjectAccess } from "@/lib/session";
import { ProjectManagement } from "@/components/app/ProjectManagement";
import { getT } from "@/lib/i18n/server";

export default async function ProjectManagementPage() {
  const { role } = await requireProjectAccess();
  const { t } = await getT();
  const canManage = role !== "employee"; // екипът управлява таблата; служителите — задачите

  return (
    <>
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 25, fontWeight: 600, margin: "0 0 3px" }}>{t("pm.pageTitle")}</h1>
        <div style={{ color: "var(--muted)", fontSize: 13 }}>{t("pm.pageSubtitle")}</div>
      </div>
      <ProjectManagement canManage={canManage} />
    </>
  );
}
