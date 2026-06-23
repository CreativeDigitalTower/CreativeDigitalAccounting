import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireFeature } from "@/lib/session";
import { audit } from "@/lib/documents";
import { z } from "zod";

const schema = z.object({
  title: z.string().min(1),
  counterpartyType: z.enum(["client", "supplier"]),
  clientId: z.string().optional().nullable(),
  supplierId: z.string().optional().nullable(),
  startDate: z.string(),
  endDate: z.string().optional().nullable(),
  autoRenew: z.boolean().default(false),
});

export async function POST(req: Request) {
  try {
    const { companyId, userId } = await requireFeature("contracts");
    const data = schema.parse(await req.json());
    const c = await prisma.contract.create({
      data: {
        companyId, title: data.title, counterpartyType: data.counterpartyType,
        clientId: data.counterpartyType === "client" ? data.clientId ?? null : null,
        supplierId: data.counterpartyType === "supplier" ? data.supplierId ?? null : null,
        startDate: new Date(data.startDate),
        endDate: data.endDate ? new Date(data.endDate) : null,
        autoRenew: data.autoRenew, status: "active",
      },
    });
    await audit(companyId, userId, "create", "Contract", c.id, data.title);
    return NextResponse.json(c);
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Невалидни данни." }, { status: 400 });
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}
