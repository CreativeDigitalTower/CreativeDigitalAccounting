import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCompany, getMyRole, getPlan } from "@/lib/session";
import { planHasFeature } from "@/lib/constants";
import { z } from "zod";

const schema = z.object({
  clients: z.boolean(),
  projects: z.boolean(),
  suppliers: z.boolean(),
  warehouse: z.boolean(),
});

export async function PUT(req: Request) {
  try {
    const { companyId, userId } = await requireCompany();
    const role = await getMyRole(userId, companyId);
    if (!role || !["owner", "manager"].includes(role)) {
      return NextResponse.json({ error: "Нямате права за тази операция." }, { status: 403 });
    }
    const plan = await getPlan(companyId);
    if (!planHasFeature(plan, "employee_portal")) {
      return NextResponse.json({ error: "Порталът за служители е достъпен само за планове Бизнес и Про." }, { status: 403 });
    }
    const data = schema.parse(await req.json());
    await prisma.company.update({ where: { id: companyId }, data: { employeeAccess: JSON.stringify(data) } });
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Невалидни данни." }, { status: 400 });
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}
