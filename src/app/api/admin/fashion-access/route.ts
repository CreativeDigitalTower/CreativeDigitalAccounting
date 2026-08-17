import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/session";
import { audit } from "@/lib/documents";
import { FASHION_MODULE_KEY } from "@/lib/fashion/config";
import { z } from "zod";

// Super Admin активиране/деактивиране на модул „Модно производство" за конкретна фирма.
// Database-driven (CompanyModuleAccess) — без промяна на код, изолирано от други клиенти.
export async function GET() {
  try {
    await requireSuperAdmin();
    const companies = await prisma.company.findMany({
      where: { archivedAt: null },
      select: {
        id: true, name: true, eik: true,
        moduleAccess: { where: { moduleKey: FASHION_MODULE_KEY }, select: { enabled: true } },
      },
      orderBy: { name: "asc" },
    });
    return NextResponse.json({
      companies: companies.map((c) => ({
        id: c.id, name: c.name, eik: c.eik, fashionEnabled: c.moduleAccess[0]?.enabled ?? false,
      })),
    });
  } catch {
    return NextResponse.json({ error: "Няма достъп." }, { status: 403 });
  }
}

const schema = z.object({ companyId: z.string(), enabled: z.boolean() });

export async function POST(req: Request) {
  try {
    const { userId } = await requireSuperAdmin();
    const { companyId, enabled } = schema.parse(await req.json());
    const company = await prisma.company.findUnique({ where: { id: companyId }, select: { id: true } });
    if (!company) return NextResponse.json({ error: "Фирмата не е намерена." }, { status: 404 });
    await prisma.companyModuleAccess.upsert({
      where: { companyId_moduleKey: { companyId, moduleKey: FASHION_MODULE_KEY } },
      create: { companyId, moduleKey: FASHION_MODULE_KEY, enabled },
      update: { enabled },
    });
    await audit(companyId, userId, "update", "CompanyModuleAccess", companyId, `Модно производство: ${enabled ? "активиран" : "деактивиран"}`);
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Невалидни данни." }, { status: 400 });
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}
