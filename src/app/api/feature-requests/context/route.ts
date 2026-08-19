import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCompany } from "@/lib/session";
import { sectorHintKey } from "@/lib/featureRequest/config";

// Prefill за формата: контакт + фирма + сектор + обхват (§4, §16, §22, §23).
export async function GET() {
  const { userId, companyId } = await requireCompany();
  const [company, user] = await Promise.all([
    prisma.company.findUnique({ where: { id: companyId }, select: { name: true, email: true, phone: true, businessSector: true, isAccountingFirm: true } }),
    prisma.user.findUnique({ where: { id: userId }, select: { email: true, name: true } }),
  ]);
  return NextResponse.json({
    companyName: company?.name ?? "",
    contactEmail: user?.email ?? company?.email ?? "",
    contactPhone: company?.phone ?? "",
    sectorHint: sectorHintKey(company?.businessSector),
    scope: company?.isAccountingFirm ? "firm" : "company",
  });
}
