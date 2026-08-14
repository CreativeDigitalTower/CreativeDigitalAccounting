import { requireSuperAdmin } from "@/lib/session";
import { AdminModuleAccess } from "@/components/app/AdminModuleAccess";

// Super Admin: индивидуално активиране на модули по фирма (Phase 1 — само „Логистика").
export default async function AdminModulesPage() {
  await requireSuperAdmin();
  return <AdminModuleAccess />;
}
