import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCompany } from "@/lib/session";

export async function POST() {
  try {
    const { userId } = await requireCompany();
    await prisma.user.update({ where: { id: userId }, data: { onboardedAt: new Date() } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}
