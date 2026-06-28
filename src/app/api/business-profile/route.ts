import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCompany } from "@/lib/session";
import { z } from "zod";

const profileSchema = z.object({
  businessSector: z.string().min(1),
  businessCategory: z.string().optional().nullable(),
  companySize: z.string().optional().nullable(),
  applyRecommended: z.boolean().optional(), // приложи препоръчителното подреждане
});

// Записване на бизнес профила
export async function POST(req: Request) {
  try {
    const { companyId } = await requireCompany();
    const data = profileSchema.parse(await req.json());
    await prisma.company.update({
      where: { id: companyId },
      data: {
        businessSector: data.businessSector,
        businessCategory: data.businessCategory ?? null,
        companySize: data.companySize ?? null,
        ...(data.applyRecommended ? { isCustomLayout: false, dashboardLayout: null } : {}),
      },
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Невалидни данни." }, { status: 400 });
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}

const layoutSchema = z.object({
  reset: z.boolean().optional(),
  order: z.array(z.string()).optional(),
  hidden: z.array(z.string()).optional(),
});

// Персонализация на подреждането на таблото
export async function PATCH(req: Request) {
  try {
    const { companyId } = await requireCompany();
    const data = layoutSchema.parse(await req.json());
    if (data.reset) {
      await prisma.company.update({ where: { id: companyId }, data: { isCustomLayout: false, dashboardLayout: null } });
      return NextResponse.json({ success: true });
    }
    await prisma.company.update({
      where: { id: companyId },
      data: { isCustomLayout: true, dashboardLayout: JSON.stringify({ order: data.order ?? [], hidden: data.hidden ?? [] }) },
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Невалидни данни." }, { status: 400 });
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}
