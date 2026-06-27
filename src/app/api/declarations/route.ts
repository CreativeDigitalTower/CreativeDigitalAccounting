import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireFeature } from "@/lib/session";
import { audit } from "@/lib/documents";
import { z } from "zod";

const schema = z.object({
  number: z.string().optional(),
  clientName: z.string().optional().nullable(),
  clientEik: z.string().optional().nullable(),
  clientAddress: z.string().optional().nullable(),
  clientMol: z.string().optional().nullable(),
  products: z.array(z.object({ name: z.string(), kg: z.string(), batch: z.string(), bestBefore: z.string() })).default([]),
  labResults: z.array(z.object({ indicator: z.string(), method: z.string(), result: z.string() })).default([]),
  declarationText: z.string().optional().nullable(),
  storageNote: z.string().optional().nullable(),
  standards: z.string().optional().nullable(),
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
        companyId, number, clientName: data.clientName ?? null, clientEik: data.clientEik ?? null,
        clientAddress: data.clientAddress ?? null, clientMol: data.clientMol ?? null,
        products: JSON.stringify(data.products), labResults: JSON.stringify(data.labResults),
        declarationText: data.declarationText ?? null, storageNote: data.storageNote ?? null,
        standards: data.standards ?? null, date: new Date(data.date), signedBy: data.signedBy ?? null,
      },
    });
    await audit(companyId, userId, "create", "ConformityDeclaration", dec.id, number);
    return NextResponse.json(dec);
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Невалидни данни." }, { status: 400 });
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}
