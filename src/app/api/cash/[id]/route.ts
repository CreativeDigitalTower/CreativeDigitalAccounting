import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireFeature } from "@/lib/session";
import { audit } from "@/lib/documents";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(1).optional(),
  balance: z.number().optional(),
  note: z.string().optional(),
});

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { companyId, userId } = await requireFeature("cash");
    const { id } = await params;
    const data = schema.parse(await req.json());

    const reg = await prisma.cashRegister.findUnique({ where: { id } });
    if (!reg || reg.companyId !== companyId) {
      return NextResponse.json({ error: "Касата не е намерена." }, { status: 404 });
    }

    // Ако се променя балансът — запиши корекция в историята
    if (data.balance !== undefined && data.balance !== reg.balance) {
      const diff = data.balance - reg.balance;
      await prisma.cashEntry.create({
        data: {
          registerId: id,
          type: diff >= 0 ? "in" : "out",
          amount: Math.abs(diff),
          note: data.note ?? "Ръчна корекция на наличност",
        },
      });
      await audit(companyId, userId, "update", "CashRegister", id, `Наличност ${reg.balance} → ${data.balance}`);
    }

    const updated = await prisma.cashRegister.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.balance !== undefined ? { balance: data.balance } : {}),
      },
    });
    return NextResponse.json(updated);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Невалидни данни." }, { status: 400 });
    }
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { companyId } = await requireFeature("cash");
    const { id } = await params;
    const reg = await prisma.cashRegister.findUnique({ where: { id } });
    if (!reg || reg.companyId !== companyId) {
      return NextResponse.json({ error: "Касата не е намерена." }, { status: 404 });
    }
    await prisma.cashRegister.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}
