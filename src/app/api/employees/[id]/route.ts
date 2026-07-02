import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireFeature } from "@/lib/session";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(2),
  position: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  salary: z.number().optional().nullable(),
  hiredAt: z.string().optional().nullable(),
  paidLeaveDays: z.number().int().min(0).optional(),
  notes: z.string().optional().nullable(),
  active: z.boolean().optional(),
  department: z.string().optional().nullable(),
  contractType: z.string().optional().nullable(),
  paymentMethod: z.enum(["bank", "cash"]).optional(),
  iban: z.string().optional().nullable(),
  bankName: z.string().optional().nullable(),
});

async function owned(companyId: string, id: string) {
  const e = await prisma.employee.findUnique({ where: { id } });
  return e && e.companyId === companyId ? e : null;
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { companyId } = await requireFeature("employees");
    const { id } = await params;
    if (!(await owned(companyId, id))) return NextResponse.json({ error: "Не е намерен." }, { status: 404 });
    const data = schema.parse(await req.json());
    const employee = await prisma.employee.update({
      where: { id },
      data: {
        name: data.name, position: data.position ?? null, phone: data.phone ?? null,
        email: data.email ?? null, address: data.address ?? null, salary: data.salary ?? null,
        hiredAt: data.hiredAt ? new Date(data.hiredAt) : null,
        paidLeaveDays: data.paidLeaveDays ?? 20, notes: data.notes ?? null,
        active: data.active ?? true,
        department: data.department ?? null, contractType: data.contractType ?? null,
        paymentMethod: data.paymentMethod ?? "bank", iban: data.iban ?? null, bankName: data.bankName ?? null,
      },
    });
    return NextResponse.json(employee);
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Невалидни данни." }, { status: 400 });
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { companyId } = await requireFeature("employees");
    const { id } = await params;
    if (!(await owned(companyId, id))) return NextResponse.json({ error: "Не е намерен." }, { status: 404 });
    await prisma.employee.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}
