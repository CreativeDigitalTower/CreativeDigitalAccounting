import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireFeature } from "@/lib/session";
import { z } from "zod";

const opt = z.string().optional().nullable();
export const tdSchema = z.object({
  docNumber: opt,
  productName: z.string().min(1),
  purpose: opt,
  classification: opt,
  ingredients: opt,
  rawMaterials: opt,
  packaging: opt,
  preparation: opt,
  process: opt,
  bakingTime: opt,
  bakingTemp: opt,
  cooling: opt,
  organoleptic: opt,
  physicochemical: opt,
  microbiological: opt,
  samplingMethods: opt,
  labeling: opt,
  storage: opt,
  storageConditions: opt,
  transport: opt,
  shelfLife: opt,
  productionControl: opt,
  notes: opt,
});

export async function GET() {
  try {
    const { companyId } = await requireFeature("haccp");
    const docs = await prisma.technologicalDoc.findMany({ where: { companyId }, orderBy: { createdAt: "desc" } });
    return NextResponse.json(docs);
  } catch {
    return NextResponse.json({ error: "Неоторизиран достъп." }, { status: 401 });
  }
}

export async function POST(req: Request) {
  try {
    const { companyId } = await requireFeature("haccp");
    const data = tdSchema.parse(await req.json());
    const doc = await prisma.technologicalDoc.create({ data: { companyId, ...data } });
    return NextResponse.json(doc);
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Невалидни данни." }, { status: 400 });
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}
