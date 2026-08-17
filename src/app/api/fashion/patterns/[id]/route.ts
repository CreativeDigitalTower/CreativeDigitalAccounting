import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fashionApiGuard } from "@/lib/fashion/access";
import { audit } from "@/lib/documents";
import { PATTERN_STATUSES } from "@/lib/fashion/styles";
import { z } from "zod";

// Промяна на статус/метаданни на конкретна версия кройка (одобряване/архивиране).
// Старите версии остават непроменени; „approved" се маркира само на избраната версия.
const schema = z.object({
  status: z.enum(PATTERN_STATUSES).optional(),
  size: z.string().max(40).nullable().optional(),
  hasPaper: z.boolean().optional(),
  hasDigital: z.boolean().optional(),
  hasMarker: z.boolean().optional(),
  author: z.string().max(120).nullable().optional(),
  note: z.string().max(2000).nullable().optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await fashionApiGuard("manage_patterns");
  if (!g.ok) return g.res;
  try {
    const { id } = await params;
    const existing = await prisma.fashionPattern.findFirst({ where: { id, companyId: g.companyId }, select: { id: true, styleId: true, version: true } });
    if (!existing) return NextResponse.json({ error: "Не е намерена." }, { status: 404 });
    const d = schema.parse(await req.json());
    const pattern = await prisma.fashionPattern.update({ where: { id }, data: d });
    await audit(g.companyId, g.userId, "update", "FashionPattern", id, `Кройка v${existing.version}${d.status ? ` → ${d.status}` : ""}`);
    return NextResponse.json(pattern);
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Невалидни данни." }, { status: 400 });
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}
