import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logisticsApiGuard } from "@/lib/logistics/access";
import { audit } from "@/lib/documents";
import { z } from "zod";

const schema = z.object({
  fromPlace: z.string().min(1).max(200).optional(),
  toPlace: z.string().min(1).max(200).optional(),
  distanceKm: z.number().nonnegative().nullable().optional(),
  estTimeMin: z.number().int().nonnegative().nullable().optional(),
  borderPoint: z.string().max(200).nullable().optional(),
  note: z.string().max(2000).nullable().optional(),
  active: z.boolean().optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await logisticsApiGuard("manage_rates");
  if (!g.ok) return g.res;
  try {
    const { id } = await params;
    const existing = await prisma.logisticsRoute.findFirst({ where: { id, companyId: g.companyId }, select: { id: true } });
    if (!existing) return NextResponse.json({ error: "Не е намерен." }, { status: 404 });
    const d = schema.parse(await req.json());
    const route = await prisma.logisticsRoute.update({
      where: { id }, data: d,
      select: { id: true, fromPlace: true, toPlace: true, distanceKm: true, estTimeMin: true, borderPoint: true, note: true, active: true },
    });
    await audit(g.companyId, g.userId, "update", "LogisticsRoute", id, "Редакция на маршрут");
    return NextResponse.json(route);
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Невалидни данни." }, { status: 400 });
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}
