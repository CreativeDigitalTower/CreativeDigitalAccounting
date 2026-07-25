import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePaidPlan } from "@/lib/session";
import { audit, checkInvoiceLimit, incrementInvoiceCounter } from "@/lib/documents";
import { z } from "zod";

const schema = z.object({
  number: z.string().optional(),
  kind: z.enum(["handover", "ddd"]).default("handover"),
  counterpartyId: z.string().optional().nullable(),
  counterpartyName: z.string().optional().nullable(),
  counterpartyEik: z.string().optional().nullable(),
  counterpartyAddress: z.string().optional().nullable(),
  counterpartyMol: z.string().optional().nullable(),
  place: z.string().optional().nullable(),
  handedBy: z.string().optional().nullable(),
  receivedBy: z.string().optional().nullable(),
  items: z.string().optional().nullable(),
  activity: z.string().optional().nullable(),
  period: z.string().optional().nullable(),
  data: z.record(z.string(), z.unknown()).optional().nullable(),
  date: z.string(),
  description: z.string().optional().nullable(),
});

export async function POST(req: Request) {
  try {
    const { companyId, userId } = await requirePaidPlan();
    if (!(await checkInvoiceLimit(companyId))) {
      return NextResponse.json({ error: "Достигнат месечен лимит за документи за вашия план." }, { status: 403 });
    }
    const data = schema.parse(await req.json());

    let number = data.number?.trim();
    if (!number) {
      const prefix = data.kind === "ddd" ? "ДДД" : "ППП";
      const count = await prisma.handoverProtocol.count({ where: { companyId, kind: data.kind } });
      number = `${prefix}-${new Date().getFullYear()}-${String(count + 1).padStart(4, "0")}`;
    }

    const p = await prisma.handoverProtocol.create({
      data: {
        companyId, number, kind: data.kind, counterpartyId: data.counterpartyId ?? null,
        counterpartyName: data.counterpartyName ?? null, counterpartyEik: data.counterpartyEik ?? null,
        counterpartyAddress: data.counterpartyAddress ?? null, counterpartyMol: data.counterpartyMol ?? null,
        place: data.place ?? null, handedBy: data.handedBy ?? null, receivedBy: data.receivedBy ?? null,
        items: data.items ?? null, activity: data.activity ?? null, period: data.period ?? null,
        data: (data.data as object) ?? undefined,
        date: new Date(data.date), description: data.description ?? null,
      },
    });
    await incrementInvoiceCounter(companyId);
    await audit(companyId, userId, "create", "HandoverProtocol", p.id, number);
    return NextResponse.json(p);
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Невалидни данни." }, { status: 400 });
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}
