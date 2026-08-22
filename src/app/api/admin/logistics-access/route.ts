import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/session";
import { audit } from "@/lib/documents";
import { LOGISTICS_MODULE_KEY, LOGISTICS_SETUP_EIK } from "@/lib/logistics/config";
import { seedLogisticsMasterData } from "@/lib/logistics/seed";
import { importCementFleet } from "@/lib/logistics/cementFleet";
import { fixSemInternationalNames } from "@/lib/logistics/companyNameFix";
import { importMkClients } from "@/lib/logistics/mkClients";
import { z } from "zod";

// Super Admin активиране на модула (корекции 1, 2, 19). ЕИК се ползва САМО за
// първоначален lookup в „setupClient"; всичко останало работи с company/group IDs
// и CompanyModuleAccess записи — без hardcode на ЕИК в runtime.

const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("setModule"), companyId: z.string(), enabled: z.boolean() }),
  z.object({ action: z.literal("createGroup"), name: z.string().min(1), note: z.string().optional() }),
  z.object({ action: z.literal("attachGroup"), companyId: z.string(), groupId: z.string().nullable() }),
  z.object({ action: z.literal("setupClient"), eik: z.string().optional() }),
  z.object({ action: z.literal("seedMasterData"), companyId: z.string() }),
  z.object({ action: z.literal("importCementFleet"), companyId: z.string() }),
  z.object({ action: z.literal("fixSemInternationalNames"), companyId: z.string() }),
  z.object({ action: z.literal("importMkClients"), companyId: z.string() }),
]);

export async function GET() {
  try {
    const { userId } = await requireSuperAdmin();
    void userId;
    const [companies, groups] = await Promise.all([
      prisma.company.findMany({
        where: { archivedAt: null },
        select: {
          id: true, name: true, eik: true, companyGroupId: true,
          moduleAccess: { where: { moduleKey: LOGISTICS_MODULE_KEY }, select: { enabled: true } },
        },
        orderBy: { name: "asc" },
      }),
      prisma.companyGroup.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    ]);
    return NextResponse.json({
      companies: companies.map((c) => ({
        id: c.id, name: c.name, eik: c.eik, companyGroupId: c.companyGroupId,
        logisticsEnabled: c.moduleAccess[0]?.enabled ?? false,
      })),
      groups,
    });
  } catch {
    return NextResponse.json({ error: "Няма достъп." }, { status: 403 });
  }
}

export async function POST(req: Request) {
  try {
    const { userId } = await requireSuperAdmin();
    const body = schema.parse(await req.json());

    if (body.action === "setModule") {
      const company = await prisma.company.findUnique({ where: { id: body.companyId }, select: { id: true } });
      if (!company) return NextResponse.json({ error: "Фирмата не е намерена." }, { status: 404 });
      await prisma.companyModuleAccess.upsert({
        where: { companyId_moduleKey: { companyId: body.companyId, moduleKey: LOGISTICS_MODULE_KEY } },
        create: { companyId: body.companyId, moduleKey: LOGISTICS_MODULE_KEY, enabled: body.enabled },
        update: { enabled: body.enabled },
      });
      await audit(body.companyId, userId, "module_access", "CompanyModuleAccess", body.companyId,
        `Логистичен модул ${body.enabled ? "активиран" : "деактивиран"}`);
      return NextResponse.json({ success: true });
    }

    if (body.action === "createGroup") {
      const group = await prisma.companyGroup.create({ data: { name: body.name, note: body.note ?? null } });
      return NextResponse.json({ success: true, group });
    }

    if (body.action === "attachGroup") {
      const company = await prisma.company.findUnique({ where: { id: body.companyId }, select: { id: true } });
      if (!company) return NextResponse.json({ error: "Фирмата не е намерена." }, { status: 404 });
      if (body.groupId) {
        const g = await prisma.companyGroup.findUnique({ where: { id: body.groupId }, select: { id: true } });
        if (!g) return NextResponse.json({ error: "Групата не е намерена." }, { status: 404 });
      }
      await prisma.company.update({ where: { id: body.companyId }, data: { companyGroupId: body.groupId } });
      await audit(body.companyId, userId, "company_group", "Company", body.companyId,
        body.groupId ? `Присъединена към група ${body.groupId}` : "Отделена от група");
      return NextResponse.json({ success: true });
    }

    if (body.action === "seedMasterData") {
      const company = await prisma.company.findUnique({ where: { id: body.companyId }, select: { id: true } });
      if (!company) return NextResponse.json({ error: "Фирмата не е намерена." }, { status: 404 });
      const res = await seedLogisticsMasterData(body.companyId);
      await audit(body.companyId, userId, "seed_master_data", "Company", body.companyId,
        `Master data: ${res.vehicles} автомобила, ${res.products} продукта`);
      return NextResponse.json({ success: true, seeded: res });
    }

    if (body.action === "importCementFleet") {
      const company = await prisma.company.findUnique({ where: { id: body.companyId }, select: { id: true } });
      if (!company) return NextResponse.json({ error: "Фирмата не е намерена." }, { status: 404 });
      const res = await importCementFleet(body.companyId);
      await audit(body.companyId, userId, "import_fleet", "Company", body.companyId,
        `Автопарк (цимент): ${res.carriers} превозвача, ${res.trucks} влекача, ${res.configurations} конфигурации`);
      return NextResponse.json({ success: true, imported: res });
    }

    if (body.action === "fixSemInternationalNames") {
      const company = await prisma.company.findUnique({ where: { id: body.companyId }, select: { id: true } });
      if (!company) return NextResponse.json({ error: "Фирмата не е намерена." }, { status: 404 });
      const res = await fixSemInternationalNames(body.companyId);
      await audit(body.companyId, userId, "fix_names", "Company", body.companyId,
        `Корекция на име: ${res.companiesFixed.length} фирми, ${res.clientsFixed.length} клиенти → SEM INTERNATIONAL DOOEL`);
      return NextResponse.json({ success: true, fixed: res });
    }

    if (body.action === "importMkClients") {
      const company = await prisma.company.findUnique({ where: { id: body.companyId }, select: { id: true } });
      if (!company) return NextResponse.json({ error: "Фирмата не е намерена." }, { status: 404 });
      const res = await importMkClients(body.companyId);
      await audit(body.companyId, userId, "import_clients", "Company", body.companyId,
        `MK клиенти: ${res.created} нови, ${res.updated} обновени, ${res.skipped} пропуснати`);
      return NextResponse.json({ success: true, imported: res });
    }

    // setupClient: еднократна безопасна начална настройка за клиента по ЕИК.
    const eik = body.eik?.trim() || LOGISTICS_SETUP_EIK;
    const company = await prisma.company.findFirst({ where: { eik, archivedAt: null }, select: { id: true, name: true, companyGroupId: true } });
    if (!company) return NextResponse.json({ error: `Няма фирма с ЕИК ${eik}.` }, { status: 404 });

    const result = await prisma.$transaction(async (tx) => {
      let groupId = company.companyGroupId;
      if (!groupId) {
        const group = await tx.companyGroup.create({ data: { name: `Група ${company.name}` } });
        groupId = group.id;
        await tx.company.update({ where: { id: company.id }, data: { companyGroupId: groupId } });
      }
      await tx.companyModuleAccess.upsert({
        where: { companyId_moduleKey: { companyId: company.id, moduleKey: LOGISTICS_MODULE_KEY } },
        create: { companyId: company.id, moduleKey: LOGISTICS_MODULE_KEY, enabled: true },
        update: { enabled: true },
      });
      return { groupId };
    });
    // Начална master data (idempotent) — автомобили + продукти на клиента.
    const seeded = await seedLogisticsMasterData(company.id);
    await audit(company.id, userId, "module_setup", "Company", company.id,
      `Логистичен модул активиран (setup по ЕИК ${eik}), група ${result.groupId}, ${seeded.vehicles} авт./${seeded.products} прод.`);
    return NextResponse.json({ success: true, companyId: company.id, groupId: result.groupId, seeded });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Невалидни данни." }, { status: 400 });
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}
