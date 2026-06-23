import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireFeature } from "@/lib/session";
import { audit } from "@/lib/documents";
import { z } from "zod";

const schema = z.object({
  number: z.string().optional(),
  counterpartyId: z.string().optional().nullable(),
  date: z.string(),
  description: z.string().optional().nullable(),
});

export async function POST(req: Request) {
  try {
    const { companyId, userId } = await requireFeature("archive");
    const data = schema.parse(await req.json());

    let number = data.number?.trim();
    if (!number) {
      const count = await prisma.handoverProtocol.count({ where: { companyId } });
      number = `ППП-${new Date().getFullYear()}-${String(count + 1).padStart(4, "0")}`;
    }

    const p = await prisma.handoverProtocol.create({
      data: {
        companyId, number, counterpartyId: data.counterpartyId ?? null,
        date: new Date(data.date), description: data.description ?? null,
      },
    });
    await audit(companyId, userId, "create", "HandoverProtocol", p.id, number);
    return NextResponse.json(p);
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Невалидни данни." }, { status: 400 });
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}
