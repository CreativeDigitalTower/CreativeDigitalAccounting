import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logisticsApiGuard } from "@/lib/logistics/access";
import { audit } from "@/lib/documents";
import { z } from "zod";

const select = { id: true, fromPlace: true, toPlace: true, distanceKm: true, estTimeMin: true, borderPoint: true, note: true, active: true } as const;

export async function GET() {
  const g = await logisticsApiGuard("view_logistics");
  if (!g.ok) return g.res;
  const routes = await prisma.logisticsRoute.findMany({ where: { companyId: g.companyId }, select, orderBy: [{ fromPlace: "asc" }, { toPlace: "asc" }] });
  return NextResponse.json(routes);
}

const schema = z.object({
  fromPlace: z.string().min(1).max(200),
  toPlace: z.string().min(1).max(200),
  distanceKm: z.number().nonnegative().nullable().optional(),
  estTimeMin: z.number().int().nonnegative().nullable().optional(),
  borderPoint: z.string().max(200).nullable().optional(),
  note: z.string().max(2000).nullable().optional(),
});

export async function POST(req: Request) {
  const g = await logisticsApiGuard("manage_rates");
  if (!g.ok) return g.res;
  try {
    const d = schema.parse(await req.json());
    const route = await prisma.logisticsRoute.create({ data: { companyId: g.companyId, ...d }, select });
    await audit(g.companyId, g.userId, "create", "LogisticsRoute", route.id, `Маршрут ${d.fromPlace} → ${d.toPlace}`);
    return NextResponse.json(route);
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Невалидни данни." }, { status: 400 });
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}
