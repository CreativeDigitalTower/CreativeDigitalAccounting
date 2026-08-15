import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logisticsApiGuard } from "@/lib/logistics/access";
import { audit } from "@/lib/documents";
import { validateUpload, MAX_UPLOAD_BYTES } from "@/lib/fileSecurity";
import { isValidShipmentDocType } from "@/lib/logistics/config";
import { z } from "zod";

const listSelect = {
  id: true, docType: true, name: true, number: true, docDate: true, note: true,
  originalFilename: true, mimeType: true, size: true, createdAt: true,
} as const;

async function ownedShipment(companyId: string, id: string) {
  return prisma.shipment.findFirst({ where: { id, companyId, deletedAt: null }, select: { id: true } });
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await logisticsApiGuard("view_logistics");
  if (!g.ok) return g.res;
  const { id } = await params;
  if (!(await ownedShipment(g.companyId, id))) return NextResponse.json([], { status: 200 });
  const docs = await prisma.shipmentDocument.findMany({ where: { shipmentId: id, deletedAt: null }, select: listSelect, orderBy: { createdAt: "desc" } });
  return NextResponse.json(docs);
}

const optDate = z.string().datetime().nullable().optional().or(z.literal("").transform(() => null));
const schema = z.object({
  docType: z.string().max(40),
  name: z.string().max(300).nullable().optional(),
  number: z.string().max(120).nullable().optional(),
  docDate: optDate,
  note: z.string().max(2000).nullable().optional(),
  originalFilename: z.string().min(1).max(300),
  mimeType: z.string().min(1),
  size: z.number().int().positive().max(MAX_UPLOAD_BYTES, "Файлът е твърде голям (макс. 5 MB)."),
  dataUrl: z.string().min(1),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await logisticsApiGuard("manage_documents");
  if (!g.ok) return g.res;
  try {
    const { id } = await params;
    if (!(await ownedShipment(g.companyId, id))) return NextResponse.json({ error: "Курсът не е намерен." }, { status: 404 });
    const d = schema.parse(await req.json());
    const v = validateUpload({ mimeType: d.mimeType, size: d.size, dataUrl: d.dataUrl });
    if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 });
    const docType = isValidShipmentDocType(d.docType) ? d.docType : "other";

    const doc = await prisma.shipmentDocument.create({
      data: {
        shipmentId: id, docType, name: d.name ?? null, number: d.number ?? null,
        docDate: d.docDate ? new Date(d.docDate) : null, note: d.note ?? null,
        filename: d.originalFilename, originalFilename: d.originalFilename, mimeType: d.mimeType, size: d.size, dataUrl: d.dataUrl,
        uploadedById: g.userId,
      }, select: listSelect,
    });
    await audit(g.companyId, g.userId, "create", "ShipmentDocument", doc.id, `Документ (${docType}) към курс ${id}`);
    return NextResponse.json(doc);
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.issues[0]?.message ?? "Невалидни данни." }, { status: 400 });
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}
