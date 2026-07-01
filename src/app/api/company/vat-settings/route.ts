import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCompany } from "@/lib/session";
import { z } from "zod";

export async function GET() {
  const { companyId } = await requireCompany();
  const c = await prisma.company.findUnique({ where: { id: companyId }, select: { vatRegistered: true, defaultVatExempt: true, defaultVatExemptReason: true } });
  return NextResponse.json(c ?? {});
}

export async function POST(req: Request) {
  const { companyId } = await requireCompany();
  const d = z.object({
    vatRegistered: z.boolean().optional(),
    defaultVatExempt: z.boolean().optional(),
    defaultVatExemptReason: z.string().nullable().optional(),
  }).parse(await req.json());
  await prisma.company.update({ where: { id: companyId }, data: d });
  return NextResponse.json({ ok: true });
}
