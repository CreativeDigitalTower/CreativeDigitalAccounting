import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fashionApiGuard, getFashionSettings } from "@/lib/fashion/access";
import { audit } from "@/lib/documents";
import { COSTING_METHODS, OVERHEAD_METHODS } from "@/lib/fashion/config";
import { z } from "zod";

export async function GET() {
  const g = await fashionApiGuard("view_fashion");
  if (!g.ok) return g.res;
  const settings = await getFashionSettings(g.companyId);
  return NextResponse.json(settings);
}

const schema = z.object({
  defaultCurrency: z.string().min(3).max(3).optional(),
  laborHourlyRate: z.number().min(0).optional(),
  costingMethod: z.enum(COSTING_METHODS).optional(),
  overheadMethod: z.enum(OVERHEAD_METHODS).optional(),
  overheadValue: z.number().min(0).optional(),
  allowNegativeStock: z.boolean().optional(),
});

export async function PUT(req: Request) {
  const g = await fashionApiGuard("manage_settings");
  if (!g.ok) return g.res;
  try {
    const d = schema.parse(await req.json());
    await getFashionSettings(g.companyId); // гарантира съществуване
    const settings = await prisma.fashionSettings.update({ where: { companyId: g.companyId }, data: d });
    await audit(g.companyId, g.userId, "update", "FashionSettings", settings.id, "Редакция на настройки на модула");
    return NextResponse.json(settings);
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Невалидни данни." }, { status: 400 });
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}
