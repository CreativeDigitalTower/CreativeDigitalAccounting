import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logisticsApiGuard } from "@/lib/logistics/access";
import { audit } from "@/lib/documents";
import { z } from "zod";

const select = { id: true, name: true, eik: true, contact: true, phone: true, email: true, note: true, active: true } as const;

export async function GET() {
  const g = await logisticsApiGuard("view_logistics");
  if (!g.ok) return g.res;
  const carriers = await prisma.carrier.findMany({ where: { companyId: g.companyId }, select, orderBy: { name: "asc" } });
  return NextResponse.json(carriers);
}

const schema = z.object({
  name: z.string().min(1).max(200),
  eik: z.string().max(40).nullable().optional(),
  contact: z.string().max(200).nullable().optional(),
  phone: z.string().max(60).nullable().optional(),
  email: z.string().max(200).nullable().optional(),
  note: z.string().max(2000).nullable().optional(),
});

export async function POST(req: Request) {
  const g = await logisticsApiGuard("manage_rates");
  if (!g.ok) return g.res;
  try {
    const d = schema.parse(await req.json());
    const carrier = await prisma.carrier.create({ data: { companyId: g.companyId, ...d }, select });
    await audit(g.companyId, g.userId, "create", "Carrier", carrier.id, `Превозвач „${d.name}"`);
    return NextResponse.json(carrier);
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Невалидни данни." }, { status: 400 });
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}
