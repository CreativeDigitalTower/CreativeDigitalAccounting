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
    // ЕДНА A4 portrait страница = ДВЕ идентични копия (по ~148.5mm), фина линия за рязане
    // по средата. margin:0 на @page, за да няма скалиране/втора страница/браузърски полета.
    return (
      <div className="disp-print-root">
        <style>{`
          @page { size: A4 portrait; margin: 0; }
          @media print {
            html, body { margin: 0 !important; padding: 0 !important; background: #fff !important; }
            body.printing-multi { background: #fff; }
            .disp-print-root { margin: 0; }
          }
          .disp-sheet { width: 210mm; min-height: 297mm; margin: 0 auto; background: #fff; box-sizing: border-box; display: flex; flex-direction: column; }
          .disp-half { height: 148.5mm; box-sizing: border-box; overflow: hidden; padding: 3mm 0; }
          .disp-cut { border-top: 1px dashed #8a8a8a; position: relative; height: 0; }
          .disp-cut::after { content: "✂ — — — — — — — — — — — — — — — — — — — — — — — — — — — — —"; position: absolute; left: 8mm; top: -8px; font-size: 9px; letter-spacing: 1px; color: #9a9a9a; background: #fff; padding: 0 4px; white-space: nowrap; }
          @media print { .disp-half { break-inside: avoid; page-break-inside: avoid; } .disp-sheet { page-break-after: avoid; } }
        `}</style>
        <AutoPrint />
        <div className="disp-sheet">
          <div className="disp-half">{copy}</div>
          <div className="disp-cut no-print-hide" />
          <div className="disp-half">{copy}</div>
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
