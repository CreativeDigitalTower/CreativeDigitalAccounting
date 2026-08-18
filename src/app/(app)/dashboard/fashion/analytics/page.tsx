import { redirect } from "next/navigation";
import { requireFashionProduction } from "@/lib/fashion/access";
import { prisma } from "@/lib/prisma";
import { AnalyticsClient } from "@/components/app/fashion/AnalyticsClient";

export default async function Page() {
  const { companyId, caps } = await requireFashionProduction();
  if (!caps.view_analytics) redirect("/dashboard/fashion");
  const styles = await prisma.fashionStyle.findMany({ where: { companyId }, select: { collection: true } });
  const collections = [...new Set(styles.map((s) => s.collection).filter(Boolean) as string[])].sort();
  return <AnalyticsClient collections={collections} />;
}
