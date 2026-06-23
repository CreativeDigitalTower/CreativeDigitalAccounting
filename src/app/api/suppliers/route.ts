import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCompany } from "@/lib/session";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(2),
  eik: z.string().optional(),
  vatNumber: z.string().optional(),
  address: z.string().optional(),
  contactEmail: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  rating: z.number().min(1).max(5).optional(),
  notes: z.string().optional(),
});

export async function GET() {
  try {
    const { companyId } = await requireCompany();
    const suppliers = await prisma.supplier.findMany({
      where: { companyId },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(suppliers);
  } catch {
    return NextResponse.json({ error: "Неоторизиран достъп." }, { status: 401 });
  }
}

export async function POST(req: Request) {
  try {
    const { companyId } = await requireCompany();
    const body = await req.json();
    const data = schema.parse(body);
    const supplier = await prisma.supplier.create({
      data: { companyId, ...data, contactEmail: data.contactEmail || null },
    });
    return NextResponse.json(supplier);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Невалидни данни." }, { status: 400 });
    }
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}
