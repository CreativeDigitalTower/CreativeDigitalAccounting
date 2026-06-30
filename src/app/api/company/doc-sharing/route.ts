import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCompany } from "@/lib/session";
import { z } from "zod";

export async function GET() {
  const { companyId } = await requireCompany();
  const c = await prisma.company.findUnique({ where: { id: companyId }, select: { shareDocsInternally: true } });
  return NextResponse.json({ shareDocsInternally: c?.shareDocsInternally ?? true });
}

export async function POST(req: Request) {
  const { companyId } = await requireCompany();
  const { shareDocsInternally } = z.object({ shareDocsInternally: z.boolean() }).parse(await req.json());
  await prisma.company.update({ where: { id: companyId }, data: { shareDocsInternally } });
  return NextResponse.json({ ok: true });
}
