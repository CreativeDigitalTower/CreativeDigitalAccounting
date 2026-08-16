import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logisticsApiGuard } from "@/lib/logistics/access";
import { audit } from "@/lib/documents";
import { EXPORT_DOC_TYPES } from "@/lib/logistics/config";
import { buildDocumentData, type Party } from "@/lib/logistics/exportDocs";
import { z } from "zod";

const schema = z.object({ force: z.boolean().optional(), docTypes: z.array(z.string()).optional() });
const partyOf = (c: { name: string; address: string | null; city: string | null; country: string | null; eik: string | null; registrationNumber: string | null; vatNumber: string | null } | null): Party =>
  c ? { name: c.name, address: c.address, city: c.city, country: c.country, eik: c.eik, registrationNumber: c.registrationNumber, vatNumber: c.vatNumber } : { name: null };

// „Генерирай всички" — създава/обновява 6-те документа-snapshot от source. Не презаписва
// документи с ръчни промени (overridden) освен при force; връща какво е пропуснато.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await logisticsApiGuard("manage_documents");
  if (!g.ok) return g.res;
  try {
    const { id } = await params;
    const d = schema.parse(await req.json().catch(() => ({})));
    const set = await prisma.exportDocumentSet.findFirst({
      where: { id, companyId: g.companyId },
      select: {
        invoiceNumber: true, invoiceDate: true, destination: true, truckRegSnapshot: true, trailerReg: true,
        productSnapshot: true, quantity: true, unit: true, declarationCmrDate: true, dispatchNumber: true,
        logisticsProductId: true, buyerCompanyId: true, clientId: true,
        documents: { select: { docType: true, overridden: true } },
      },
    });
    if (!set) return NextResponse.json({ error: "Не е намерена." }, { status: 404 });

    const [seller, buyer, client, product, proforma] = await Promise.all([
      prisma.company.findUnique({ where: { id: g.companyId }, select: { name: true, address: true, city: true, country: true, eik: true, registrationNumber: true, vatNumber: true } }),
      set.buyerCompanyId ? prisma.company.findUnique({ where: { id: set.buyerCompanyId }, select: { name: true, address: true, city: true, country: true, eik: true, registrationNumber: true, vatNumber: true } }) : Promise.resolve(null),
      set.clientId ? prisma.client.findUnique({ where: { id: set.clientId }, select: { name: true, address: true, city: true, vatNumber: true, eik: true } }) : Promise.resolve(null),
      set.logisticsProductId ? prisma.logisticsProduct.findUnique({ where: { id: set.logisticsProductId }, select: { customsCode: true } }) : Promise.resolve(null),
      Promise.resolve(null as { number: string | null; date: string | null } | null),
    ]);

    const parties = {
      seller: partyOf(seller),
      buyer: partyOf(buyer),
      client: client ? { name: client.name, address: client.address, city: client.city, vatNumber: client.vatNumber, registrationNumber: client.eik } : null,
    };
    const src = {
      invoiceNumber: set.invoiceNumber, invoiceDate: set.invoiceDate?.toISOString() ?? null,
      destination: set.destination, truckRegSnapshot: set.truckRegSnapshot, trailerReg: set.trailerReg,
      productSnapshot: set.productSnapshot, customsCode: product?.customsCode ?? null,
      quantity: set.quantity, unit: set.unit, declarationCmrDate: set.declarationCmrDate?.toISOString() ?? null,
      dispatchNumber: set.dispatchNumber, holcimProforma: proforma,
    };

    const overridden = new Set(set.documents.filter((x) => x.overridden).map((x) => x.docType));
    const targets = (d.docTypes?.length ? d.docTypes : [...EXPORT_DOC_TYPES]).filter((t) => (EXPORT_DOC_TYPES as readonly string[]).includes(t));
    const created: string[] = []; const skipped: string[] = [];

    for (const docType of targets) {
      if (overridden.has(docType) && !d.force) { skipped.push(docType); continue; }
      const data = buildDocumentData(src, parties, docType as (typeof EXPORT_DOC_TYPES)[number]);
      await prisma.exportDocument.upsert({
        where: { setId_docType: { setId: id, docType } },
        create: { setId: id, docType, data: data as object, createdById: g.userId },
        update: { data: data as object, overridden: false }, // regenerate нулира override (само при force за overridden)
      });
      created.push(docType);
    }

    await audit(g.companyId, g.userId, "generate", "ExportDocumentSet", id, `Генерирани документи: ${created.join(", ")}${skipped.length ? ` (пропуснати с ръчни промени: ${skipped.join(", ")})` : ""}`);
    return NextResponse.json({ success: true, generated: created, skipped });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Невалидни данни." }, { status: 400 });
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}
