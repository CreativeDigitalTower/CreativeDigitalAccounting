import { requireLogistics } from "@/lib/logistics/access";
import { prisma } from "@/lib/prisma";
import { MK_DEFAULT_VAT_RATE } from "@/lib/logistics/config";
import { ReceivedDeliveries } from "@/components/app/logistics/ReceivedDeliveries";

export default async function Page() {
  const { companyId, caps } = await requireLogistics();
  const [clients, company] = await Promise.all([
    prisma.client.findMany({ where: { companyId }, select: { id: true, name: true }, orderBy: { name: "asc" }, take: 2000 }),
    prisma.company.findUnique({ where: { id: companyId }, select: { name: true } }),
  ]);
  return (
    <ReceivedDeliveries
      clients={clients}
      companyName={company?.name ?? ""}
      mkVatRate={MK_DEFAULT_VAT_RATE}
      canManage={caps.manage_invoices}
    />
  );
}
