import { requireSuperAdmin } from "@/lib/session";
import { AdminCompanyTransfer } from "@/components/app/AdminCompanyTransfer";

export default async function Page() {
  await requireSuperAdmin();
  return <AdminCompanyTransfer />;
}
