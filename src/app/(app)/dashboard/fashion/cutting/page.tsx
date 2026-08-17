import { requireFashionProduction } from "@/lib/fashion/access";
import { prisma } from "@/lib/prisma";
import { CuttingClient } from "@/components/app/fashion/CuttingClient";

export default async function Page() {
  const { companyId, caps } = await requireFashionProduction();
  const styles = await prisma.fashionStyle.findMany({
    where: { companyId, status: { notIn: ["archived"] } }, select: { id: true, code: true, name: true }, orderBy: { code: "asc" }, take: 2000,
  });
  return <CuttingClient styles={styles} canManage={caps.manage_cutting} />;
}
