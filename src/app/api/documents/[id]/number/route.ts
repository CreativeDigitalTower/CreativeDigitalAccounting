import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCompany } from "@/lib/session";
import { z } from "zod";

// Редакция на поредния номер на документ (заключен по подразбиране, отключва се с молив).
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { companyId } = await requireCompany();
    const { id } = await params;
    const { number } = z.object({ number: z.string().min(1).max(40) }).parse(await req.json());
    const clean = number.trim();

    const doc = await prisma.document.findFirst({ where: { id, companyId }, select: { id: true } });
    if (!doc) return NextResponse.json({ error: "Не е намерен" }, { status: 404 });

    // уникалност в рамките на фирмата
    const taken = await prisma.document.findFirst({ where: { companyId, number: clean, NOT: { id } }, select: { id: true } });
    if (taken) return NextResponse.json({ error: "Този номер вече се използва от друг документ." }, { status: 400 });

    const updated = await prisma.document.update({ where: { id }, data: { number: clean } });
    return NextResponse.json({ ok: true, number: updated.number });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Невалиден номер." }, { status: 400 });
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}
