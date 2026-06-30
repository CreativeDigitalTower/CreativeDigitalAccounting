import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCompany } from "@/lib/session";

// Търси регистрирана фирма по ЕИК за авто-попълване на клиентски данни.
export async function GET(req: Request) {
  try {
    const { companyId } = await requireCompany();
    const eik = new URL(req.url).searchParams.get("eik")?.trim();
    if (!eik || eik.length < 5) return NextResponse.json({ found: false });
    const c = await prisma.company.findFirst({
      where: { eik, id: { not: companyId } },
      select: { name: true, eik: true, vatNumber: true, address: true, city: true, mol: true },
    });
    if (!c) return NextResponse.json({ found: false });
    return NextResponse.json({ found: true, registered: true, company: c });
  } catch {
    return NextResponse.json({ found: false }, { status: 200 });
  }
}
