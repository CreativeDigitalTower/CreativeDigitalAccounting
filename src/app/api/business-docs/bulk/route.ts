import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCompany } from "@/lib/session";
import { z } from "zod";

// Връща съдържанието на избрани бизнес документи за пакетно сваляне.
export async function POST(req: Request) {
  try {
    const { companyId } = await requireCompany();
    const { ids } = z.object({ ids: z.array(z.string()).min(1) }).parse(await req.json());
    const docs = await prisma.businessDocument.findMany({
      where: { companyId, id: { in: ids } },
      select: { id: true, title: true, contentHtml: true },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json(docs.map((d) => ({ id: d.id, title: d.title, contentHtml: d.contentHtml.replace(/background:\s*#FCEFC7;?/gi, "") })));
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Невалидни данни." }, { status: 400 });
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}
