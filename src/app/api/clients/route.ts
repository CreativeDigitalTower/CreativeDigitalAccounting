import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCompany, getPlan } from "@/lib/session";
import { SUBSCRIPTION_PLANS } from "@/lib/constants";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(2),
  eik: z.string().optional(),
  vatNumber: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  mol: z.string().optional(),
  contactPerson: z.string().optional(),
  contactEmail: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
});

export async function GET() {
  try {
    const { companyId } = await requireCompany();
    const clients = await prisma.client.findMany({
      where: { companyId },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(clients);
  } catch {
    return NextResponse.json({ error: "Неоторизиран достъп." }, { status: 401 });
  }
}

export async function POST(req: Request) {
  try {
    const { companyId } = await requireCompany();
    const plan = await getPlan(companyId);
    const limit = SUBSCRIPTION_PLANS[plan].clients;
    if (limit !== Infinity) {
      const count = await prisma.client.count({ where: { companyId } });
      if (count >= limit) {
        return NextResponse.json({ error: `Достигнат лимит от ${limit} клиенти за вашия план. Надградете, за да добавите повече.` }, { status: 403 });
      }
    }
    const body = await req.json();
    const data = schema.parse(body);

    const client = await prisma.client.create({
      data: { companyId, ...data, contactEmail: data.contactEmail || null },
    });
    return NextResponse.json(client);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Невалидни данни." }, { status: 400 });
    }
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}
