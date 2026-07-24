import { requireCompany } from "@/lib/session";
import { DOC_ORDER } from "@/lib/documentSort";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { InvoiceDocument } from "@/components/app/InvoiceDocument";
import { OfferDocument } from "@/components/app/OfferDocument";
import { AutoPrint } from "@/components/app/AutoPrint";
import { toDocData } from "@/lib/docView";

export const dynamic = "force-dynamic";

export default async function InboxPrintPage({ searchParams }: { searchParams: Promise<{ ids?: string }> }) {
  const { companyId } = await requireCompany();
  const { ids } = await searchParams;
  const idList = (ids ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  if (!idList.length) notFound();

  const docs = await prisma.document.findMany({
    where: { id: { in: idList }, recipientCompanyId: companyId },
    include: { client: true, lines: true, company: { include: { subscription: true } } },
    orderBy: DOC_ORDER,
  });
  if (!docs.length) notFound();

  return (
    <div>
      <AutoPrint />
      <div className="print-sheet">
        {docs.map((doc) => {
          const data = toDocData(doc);
          return (
            <div key={doc.id} className="print-doc" style={{ marginBottom: 28 }}>
              {doc.type === "quote" ? <OfferDocument data={data} /> : <InvoiceDocument data={data} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}
