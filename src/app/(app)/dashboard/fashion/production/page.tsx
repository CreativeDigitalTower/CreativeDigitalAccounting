import { requireFashionProduction } from "@/lib/fashion/access";
import { prisma } from "@/lib/prisma";
import { ProductionClient } from "@/components/app/fashion/ProductionClient";

export default async function Page() {
  const { companyId, caps } = await requireFashionProduction();
  const [batches, styles] = await Promise.all([
    prisma.fashionCuttingBatch.findMany({
      where: { companyId, status: "confirmed" },
      select: { id: true, code: true, color: true, style: { select: { code: true, name: true } } },
      orderBy: { createdAt: "desc" }, take: 500,
    }),
    prisma.fashionStyle.findMany({ where: { companyId, status: { notIn: ["archived"] } }, select: { id: true, code: true, name: true, sizes: true }, orderBy: { code: "asc" }, take: 2000 }),
  ]);
  return <ProductionClient
    batches={batches.map((b) => ({ id: b.id, code: b.code, color: b.color, styleCode: b.style.code, styleName: b.style.name }))}
    styles={styles}
    canManage={caps.manage_production}
  />;
}
