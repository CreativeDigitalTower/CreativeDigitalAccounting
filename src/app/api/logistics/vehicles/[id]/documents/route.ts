import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logisticsApiGuard } from "@/lib/logistics/access";
import { audit } from "@/lib/documents";
import { validateUpload, MAX_UPLOAD_BYTES } from "@/lib/fileSecurity";
import { z } from "zod";

const listSelect = {
  id: true, docType: true, name: true, number: true, issueDate: true, validTo: true,
  originalFilename: true, mimeType: true, size: true, notes: true, createdAt: true,
} as const;

async function ownedVehicle(companyId: string, id: string) {
  return prisma.vehicle.findFirst({ where: { id, companyId }, select: { id: true } });
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await logisticsApiGuard("view_logistics");
  if (!g.ok) return g.res;
  const { id } = await params;
  if (!(await ownedVehicle(g.companyId, id))) return NextResponse.json([], { status: 200 });
  const docs = await prisma.vehicleDocument.findMany({
    where: { vehicleId: id, deletedAt: null }, select: listSelect, orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(docs);
}

const optDate = z.string().datetime().nullable().optional().or(z.literal("").transform(() => null));
const schema = z.object({
  docType: z.string().max(40).nullable().optional(),
  name: z.string().max(300).nullable().optional(),
  number: z.string().max(120).nullable().optional(),
  issueDate: optDate,
  validTo: optDate,
  notes: z.string().max(2000).nullable().optional(),
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
    if (!(await ownedVehicle(g.companyId, id))) return NextResponse.json({ error: "Автомобилът не е намерен." }, { status: 404 });
    const d = schema.parse(await req.json());
    const v = validateUpload({ mimeType: d.mimeType, size: d.size, dataUrl: d.dataUrl });
    if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 });

    const doc = await prisma.vehicleDocument.create({
      data: {
        vehicleId: id, docType: d.docType ?? "other", name: d.name ?? null, number: d.number ?? null,
        issueDate: d.issueDate ? new Date(d.issueDate) : null, validTo: d.validTo ? new Date(d.validTo) : null,
        notes: d.notes ?? null, filename: d.originalFilename, originalFilename: d.originalFilename,
        mimeType: d.mimeType, size: d.size, dataUrl: d.dataUrl, uploadedById: g.userId,
      }, select: listSelect,
    });
    await audit(g.companyId, g.userId, "create", "VehicleDocument", doc.id, `Документ към автомобил ${id}`);
    return NextResponse.json(doc);
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.issues[0]?.message ?? "Невалидни данни." }, { status: 400 });
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}
