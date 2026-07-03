import { requireProjectAccess } from "@/lib/session";
import { ProjectManagement } from "@/components/app/ProjectManagement";

export default async function ProjectManagementPage() {
  const { role } = await requireProjectAccess();
  const canManage = role !== "employee"; // екипът управлява таблата; служителите — задачите

  return (
    <>
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 25, fontWeight: 600, margin: "0 0 3px" }}>Project Management</h1>
        <div style={{ color: "var(--muted)", fontSize: 13 }}>Задачи по фирми — всяка фирма е отделна колона. Възлагайте, следете статуса и работете като екип.</div>
      </div>
      <ProjectManagement canManage={canManage} />
    </>
  );
}
