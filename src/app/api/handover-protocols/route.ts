import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePaidPlan } from "@/lib/session";
import { audit } from "@/lib/documents";
import { z } from "zod";

const schema = z.object({
  number: z.string().optional(),
  counterpartyId: z.string().optional().nullable(),
  counterpartyName: z.string().optional().nullable(),
  counterpartyEik: z.string().optional().nullable(),
  counterpartyAddress: z.string().optional().nullable(),
  counterpartyMol: z.string().optional().nullable(),
  place: z.string().optional().nullable(),
  handedBy: z.string().optional().nullable(),
  receivedBy: z.string().optional().nullable(),
  items: z.string().optional().nullable(),
  date: z.string(),
  description: z.string().optional().nullable(),
});

export async function POST(req: Request) {
  try {
    const { companyId, userId } = await requirePaidPlan();
    const data = schema.parse(await req.json());

    let number = data.number?.trim();
    if (!number) {
      const count = await prisma.handoverProtocol.count({ where: { companyId } });
      number = `ППП-${new Date().getFullYear()}-${String(count + 1).padStart(4, "0")}`;
    }

    const p = await prisma.handoverProtocol.create({
      data: {
        companyId, number, counterpartyId: data.counterpartyId ?? null,
        counterpartyName: data.counterpartyName ?? null, counterpartyEik: data.counterpartyEik ?? null,
        counterpartyAddress: data.counterpartyAddress ?? null, counterpartyMol: data.counterpartyMol ?? null,
        place: data.place ?? null, handedBy: data.handedBy ?? null, receivedBy: data.receivedBy ?? null,
        items: data.items ?? null, date: new Date(data.date), description: data.description ?? null,
      },
    });
    await audit(companyId, userId, "create", "HandoverProtocol", p.id, number);
    return NextResponse.json(p);
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Невалидни данни." }, { status: 400 });
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}
