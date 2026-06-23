import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireFeature } from "@/lib/session";
import { audit } from "@/lib/documents";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(1),
  currency: z.string().default("EUR"),
  balance: z.number().optional(),
});

export async function GET() {
  try {
    const { companyId } = await requireFeature("cash");
    const registers = await prisma.cashRegister.findMany({
      where: { companyId },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json(registers);
  } catch {
    return NextResponse.json({ error: "Неоторизиран достъп." }, { status: 401 });
  }
}

export async function POST(req: Request) {
  try {
    const { companyId, userId } = await requireFeature("cash");
    const data = schema.parse(await req.json());
    const register = await prisma.cashRegister.create({
      data: { companyId, name: data.name, currency: data.currency, balance: data.balance ?? 0 },
    });
    await audit(companyId, userId, "create", "CashRegister", register.id, `Каса „${data.name}"`);
    return NextResponse.json(register);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Невалидни данни." }, { status: 400 });
    }
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}
