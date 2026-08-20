import { requireLogistics, exportSetReadRole } from "@/lib/logistics/access";
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
    where: { docType, set: { id } },
    select: { data: true, docType: true, set: { select: { companyId: true, buyerCompanyId: true } } },
  });
  if (!doc) notFound();
  const role = await exportSetReadRole(companyId, doc.set);
  if (!role) notFound();
  const data = (doc.data ?? {}) as Record<string, unknown>;
  const isDispatch = doc.docType === "dispatch" || doc.docType === "blank";

  // ── Испратница: ЕДИН документ (един номер, един запис) се печата на A4 portrait в
  // ДВЕ идентични копия (за шофьора и за получателя, §29–32). Само print layout —
  // съдържанието/данните са абсолютно еднакви и непроменени. ──
  if (isDispatch) {
    const copy = <ExportDispatchTemplate data={data as DispatchDocData} blank={doc.docType === "blank"} />;
    return (
      <div>
        <style>{`
          @media print { @page { size: A4 portrait; margin: 8mm; } body.printing-multi { background: #fff; } }
          .disp-2up { display: flex; flex-direction: column; }
          .disp-copy { transform-origin: top center; }
          .disp-cut { border-top: 1px dashed #9a9a9a; margin: 5mm 0; height: 0; position: relative; }
          .disp-cut::after { content: "✂"; position: absolute; left: 6px; top: -9px; font-size: 11px; color: #9a9a9a; background: #fff; padding: 0 4px; }
          @media print { .disp-copy { break-inside: avoid; } .disp-2up { break-inside: avoid; } }
        `}</style>
        <AutoPrint />
        <div className="print-sheet">
          <div className="print-doc disp-2up">
            <div className="disp-copy">{copy}</div>
            <div className="disp-cut no-print-hide" />
            <div className="disp-copy">{copy}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <AutoPrint />
      <div className="print-sheet">
        <div className="print-doc">
          {doc.docType === "invoice" ? <ExportInvoiceTemplate data={data as InvoiceDocData} />
            : doc.docType === "declaration" ? <ExportDeclarationTemplate data={data as DeclarationDocData} />
            : (doc.docType === "cmr_epson" || doc.docType === "cmr_hp") ? <ExportCmrTemplate data={data as CmrDocData} />
            : <ExportDispatchTemplate data={data as DispatchDocData} />}
        </div>
      </div>
    </div>
  );
}
