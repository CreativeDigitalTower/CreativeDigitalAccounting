import { requireFeature } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { HaccpPanel } from "@/components/app/HaccpPanel";

export default async function HaccpPage() {
  const { companyId } = await requireFeature("haccp");
  const rows = await prisma.technologicalDoc.findMany({ where: { companyId }, orderBy: { createdAt: "desc" } });
  const docs = rows.map((d) => ({
    id: d.id, productName: d.productName, ingredients: d.ingredients, preparation: d.preparation,
    bakingTime: d.bakingTime, bakingTemp: d.bakingTemp, cooling: d.cooling, storage: d.storage,
    shelfLife: d.shelfLife, notes: d.notes,
  }));
  return <HaccpPanel initial={docs} />;
}
