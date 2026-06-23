import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCompany } from "@/lib/session";

export async function GET() {
  try {
    const { companyId } = await requireCompany();
    const categories = await prisma.expenseCategory.findMany({
      where: { OR: [{ companyId }, { companyId: null }] },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(categories);
  } catch {
    return NextResponse.json({ error: "Неоторизиран достъп." }, { status: 401 });
  }
}
