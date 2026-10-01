import { requireLogistics, companyCanCreateExports } from "@/lib/logistics/access";
import { prisma } from "@/lib/prisma";
import { MkSales } from "@/components/app/logistics/MkSales";
import { MkLinkedInvoices } from "@/components/app/logistics/MkLinkedInvoices";

export default async function Page() {
  const { companyId, caps } = await requireLogistics();
  // Продавачът (BG, напр. Metal Trade) вижда READ-ONLY свързаните MK фактури (§C). MK фирмата
  // (SEM), която реално издава фактури, запазва легаси create flow-а.
  const isSeller = await companyCanCreateExports(companyId);
  if (isSeller) return <MkLinkedInvoices />;
  const clients = await prisma.client.findMany({ where: { companyId }, select: { id: true, name: true }, orderBy: { name: "asc" }, take: 1000 });
  return <MkSales canManage={caps.manage_invoices} clients={clients} />;
}
