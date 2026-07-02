import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCompany, getPlan } from "@/lib/session";
import { z } from "zod";

// Връща съдържанието на избрани бизнес документи за пакетно сваляне (вкл. лого + фирма).
export async function POST(req: Request) {
  try {
    const { companyId } = await requireCompany();
    const { ids } = z.object({ ids: z.array(z.string()).min(1) }).parse(await req.json());
    const [plan, company, docs] = await Promise.all([
      getPlan(companyId),
      prisma.company.findUnique({ where: { id: companyId }, select: { name: true, logoUrl: true } }),
      prisma.businessDocument.findMany({
        where: { companyId, id: { in: ids } },
        select: { id: true, title: true, contentHtml: true },
        orderBy: { createdAt: "asc" },
      }),
    ]);
    const logoUrl = plan !== "free" ? company?.logoUrl ?? null : null;
    return NextResponse.json({
      logoUrl,
      companyName: company?.name ?? "",
      docs: docs.map((d) => ({ id: d.id, title: d.title, contentHtml: d.contentHtml.replace(/background:\s*#FCEFC7;?/gi, "") })),
    });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Невалидни данни." }, { status: 400 });
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}
