import { requireEmployee } from "@/lib/session";
import { getPlan } from "@/lib/session";
import { planHasFeature } from "@/lib/constants";
import { redirect } from "next/navigation";
import { ProjectManagement } from "@/components/app/ProjectManagement";

export default async function PortalPmPage() {
  const { companyId } = await requireEmployee();
  const plan = await getPlan(companyId);
  if (!planHasFeature(plan, "project_management")) redirect("/portal");

  return (
    <div>
      <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 700, margin: "0 0 4px" }}>Project Management</h1>
      <p style={{ fontSize: 12.5, color: "var(--muted)", margin: "0 0 16px" }}>Вашите задачи по фирми. Можете да сменяте статуса, да добавяте бележки и нови задачи.</p>
      <ProjectManagement canManage={false} />
    </div>
  );
}
