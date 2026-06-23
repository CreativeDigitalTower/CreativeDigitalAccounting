import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireFeature } from "@/lib/session";

export async function GET() {
  try {
    const { companyId } = await requireFeature("warehouse");
    const items = await prisma.stockItem.findMany({
      where: { companyId },
      orderBy: { name: "asc" },
      select: { id: true, name: true, quantity: true, unit: true },
    });
    return NextResponse.json(items);
  } catch {
    return NextResponse.json({ error: "Неоторизиран достъп." }, { status: 401 });
  }
}
