import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireFeature } from "@/lib/session";
import { audit } from "@/lib/documents";
import { z } from "zod";

const schema = z.object({
  number: z.string().optional(),
  productName: z.string().min(1),
  batchNumber: z.string().optional().nullable(),
  standards: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  issuedFor: z.string().optional().nullable(),
  date: z.string(),
  signedBy: z.string().optional().nullable(),
});

export async function POST(req: Request) {
  try {
    const { companyId, userId } = await requireFeature("declarations");
    const data = schema.parse(await req.json());
    let number = data.number?.trim();
    if (!number) {
      const count = await prisma.conformityDeclaration.count({ where: { companyId } });
      number = `ДС-${new Date().getFullYear()}-${String(count + 1).padStart(4, "0")}`;
    }
    const dec = await prisma.conformityDeclaration.create({
      data: {
        companyId, number, productName: data.productName, batchNumber: data.batchNumber ?? null,
        standards: data.standards ?? null, description: data.description ?? null,
        issuedFor: data.issuedFor ?? null, date: new Date(data.date), signedBy: data.signedBy ?? null,
      },
    });
    await audit(companyId, userId, "create", "ConformityDeclaration", dec.id, number);
    return NextResponse.json(dec);
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Невалидни данни." }, { status: 400 });
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}
