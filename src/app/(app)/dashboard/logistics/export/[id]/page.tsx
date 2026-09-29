import { requireLogistics } from "@/lib/logistics/access";
import { ExportSetDetail } from "@/components/app/logistics/ExportSetDetail";
import { getT } from "@/lib/i18n/server";

export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ mkInvoice?: string }> }) {
  const { caps } = await requireLogistics();
  const { id } = await params;
  const { mkInvoice } = await searchParams;
  const { t } = await getT();
  // Authorized error от canonical open-invoice route (§15): ясно съобщение, не 404.
  const notice = mkInvoice === "denied" ? t("logistics.export.mkAccessDenied")
    : mkInvoice === "none" ? t("logistics.export.mkNotFound") : null;
  return (
    <>
      {notice && (
        <div style={{ background: "var(--brass-soft,rgba(192,138,45,.14))", border: "1px solid var(--brass,#9A6B18)", borderRadius: 8, padding: "8px 12px", fontSize: 12.5, marginBottom: 12, maxWidth: 940 }}>
          {notice}
        </div>
      )}
      <ExportSetDetail id={id} canManage={caps.manage_documents} />
    </>
  );
}
