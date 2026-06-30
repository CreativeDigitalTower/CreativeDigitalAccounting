import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCompany } from "@/lib/session";

export async function POST() {
  try {
    const { companyId } = await requireCompany();
    await prisma.notification.updateMany({ where: { companyId, read: false }, data: { read: true } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
