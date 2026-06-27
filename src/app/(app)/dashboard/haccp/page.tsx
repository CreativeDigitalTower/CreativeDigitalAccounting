import { requireFeature } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { HaccpPanel, type TD } from "@/components/app/HaccpPanel";

export default async function HaccpPage() {
  const { companyId } = await requireFeature("haccp");
  const rows = await prisma.technologicalDoc.findMany({ where: { companyId }, orderBy: { createdAt: "desc" } });
  const docs = rows.map(({ createdAt, companyId: _c, ...rest }) => rest) as unknown as TD[];
  return <HaccpPanel initial={docs} />;
}
