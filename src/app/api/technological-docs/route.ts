import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireFeature } from "@/lib/session";
import { z } from "zod";

const schema = z.object({
  productName: z.string().min(1),
  ingredients: z.string().optional().nullable(),
  preparation: z.string().optional().nullable(),
  bakingTime: z.string().optional().nullable(),
  bakingTemp: z.string().optional().nullable(),
  cooling: z.string().optional().nullable(),
  storage: z.string().optional().nullable(),
  shelfLife: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
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
    const data = schema.parse(await req.json());
    const doc = await prisma.technologicalDoc.create({ data: { companyId, ...data } });
    return NextResponse.json(doc);
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Невалидни данни." }, { status: 400 });
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}
