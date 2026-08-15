import { requireLogistics } from "@/lib/logistics/access";
import { prisma } from "@/lib/prisma";
import { MkSales } from "@/components/app/logistics/MkSales";

export default async function Page() {
  const { companyId, caps } = await requireLogistics();
  const clients = await prisma.client.findMany({ where: { companyId }, select: { id: true, name: true }, orderBy: { name: "asc" }, take: 1000 });
  return <MkSales canManage={caps.manage_invoices} clients={clients} />;
}
