import { requireFeature } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { RevisionForm } from "@/components/app/RevisionForm";

export default async function RevisionPage() {
  const { companyId } = await requireFeature("revision");
  const rows = await prisma.stockItem.findMany({ where: { companyId }, orderBy: { name: "asc" } });
  const items = rows.map((i) => ({ id: i.id, name: i.name, unit: i.unit, quantity: i.quantity }));
  return <RevisionForm items={items} />;
}
