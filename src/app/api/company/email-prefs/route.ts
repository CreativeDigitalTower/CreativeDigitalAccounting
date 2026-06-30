import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCompany } from "@/lib/session";
import { parsePrefs } from "@/lib/email/prefs";

export async function GET() {
  const { companyId } = await requireCompany();
  const c = await prisma.company.findUnique({ where: { id: companyId }, select: { emailPrefs: true } });
  return NextResponse.json(parsePrefs(c?.emailPrefs));
}

export async function POST(req: Request) {
  const { companyId } = await requireCompany();
  const body = await req.json();
  // keep only boolean values
  const clean: Record<string, boolean> = {};
  for (const [k, v] of Object.entries(body)) if (typeof v === "boolean") clean[k] = v;
  await prisma.company.update({ where: { id: companyId }, data: { emailPrefs: JSON.stringify(clean) } });
  return NextResponse.json({ ok: true });
}
