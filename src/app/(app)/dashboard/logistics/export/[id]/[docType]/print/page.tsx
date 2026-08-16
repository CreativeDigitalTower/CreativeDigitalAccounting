import { requireLogistics } from "@/lib/logistics/access";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { AutoPrint } from "@/components/app/AutoPrint";
import { ExportInvoiceTemplate, type InvoiceDocData } from "@/components/app/logistics/ExportInvoiceTemplate";
import { ExportDispatchTemplate, type DispatchDocData } from "@/components/app/logistics/ExportDispatchTemplate";
import { ExportDeclarationTemplate, type DeclarationDocData } from "@/components/app/logistics/ExportDeclarationTemplate";
import { ExportCmrTemplate, type CmrDocData } from "@/components/app/logistics/ExportCmrTemplate";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ id: string; docType: string }> }) {
  const { companyId } = await requireLogistics();
  const { id, docType } = await params;
  const doc = await prisma.exportDocument.findFirst({
    where: { docType, set: { id, companyId } },
    select: { data: true, docType: true },
  });
  if (!doc) notFound();
  const data = (doc.data ?? {}) as Record<string, unknown>;

  return (
    <div>
      <AutoPrint />
      <div className="print-sheet">
        <div className="print-doc">
          {doc.docType === "invoice" ? <ExportInvoiceTemplate data={data as InvoiceDocData} />
            : doc.docType === "declaration" ? <ExportDeclarationTemplate data={data as DeclarationDocData} />
            : (doc.docType === "cmr_epson" || doc.docType === "cmr_hp") ? <ExportCmrTemplate data={data as CmrDocData} />
            : <ExportDispatchTemplate data={data as DispatchDocData} blank={doc.docType === "blank"} />}
        </div>
      </div>
    </div>
  );
}
