import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logisticsApiGuard } from "@/lib/logistics/access";
import { audit } from "@/lib/documents";
import { z } from "zod";

const select = { bgCurrency: true, mkCurrency: true, mkVatRate: true } as const;

export async function GET() {
  const g = await logisticsApiGuard("view_logistics");
  if (!g.ok) return g.res;
  const s = await prisma.logisticsSettings.upsert({
    where: { companyId: g.companyId }, create: { companyId: g.companyId }, update: {}, select,
  });
  return NextResponse.json(s);
}

const schema = z.object({
  bgCurrency: z.string().min(2).max(8).optional(),
  mkCurrency: z.string().min(2).max(8).optional(),
  mkVatRate: z.number().min(0).max(100).optional(),
});

export async function PATCH(req: Request) {
  const g = await logisticsApiGuard("manage_rates");
  if (!g.ok) return g.res;
  try {
    const d = schema.parse(await req.json());
    const s = await prisma.logisticsSettings.upsert({
      where: { companyId: g.companyId }, create: { companyId: g.companyId, ...d }, update: d, select,
    });
    await audit(g.companyId, g.userId, "update", "LogisticsSettings", g.companyId, "Настройки на модула");
    return NextResponse.json(s);
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Невалидни данни." }, { status: 400 });
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}
