import { requireFashionProduction } from "@/lib/fashion/access";
import { SalesReportDetail } from "@/components/app/fashion/SalesReportDetail";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { caps } = await requireFashionProduction();
  const { id } = await params;
  return <SalesReportDetail id={id} canManage={caps.manage_sales_reports} />;
}
