import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireFeature } from "@/lib/session";
import { z } from "zod";

export async function GET() {
  try {
    const { companyId } = await requireFeature("warehouse");
    const items = await prisma.warehouse.findMany({ where: { companyId }, orderBy: { name: "asc" } });
    return NextResponse.json(items);
  } catch {
    return NextResponse.json({ error: "Неоторизиран достъп." }, { status: 401 });
  }
}

export async function POST(req: Request) {
  try {
    const { companyId } = await requireFeature("warehouse");
    const { name } = z.object({ name: z.string().min(1) }).parse(await req.json());
    const w = await prisma.warehouse.create({ data: { companyId, name } });
    return NextResponse.json(w);
  } catch {
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}
