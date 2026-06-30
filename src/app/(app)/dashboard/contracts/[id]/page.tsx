import { requireFeature } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { ContractDetail } from "@/components/app/ContractDetail";

export default async function ContractDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { companyId } = await requireFeature("contracts");
  const { id } = await params;
  const c = await prisma.contract.findFirst({ where: { id, companyId }, include: { client: true, supplier: true } });
  if (!c) notFound();

  const party = `${c.counterpartyType === "client" ? "Клиент" : "Доставчик"}: ${(c.counterpartyType === "client" ? c.client?.name : c.supplier?.name) ?? "—"}`;

  return (
    <ContractDetail
      contract={{
        id: c.id, title: c.title, party, startDate: c.startDate.toISOString(),
        endDate: c.endDate?.toISOString() ?? null, autoRenew: c.autoRenew, status: c.status,
        value: c.value, notes: c.notes, hasFile: !!c.attachmentUrl,
      }}
    />
  );
}
