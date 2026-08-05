import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCompany, getPlan } from "@/lib/session";
import { planHasFeature } from "@/lib/constants";
import { audit } from "@/lib/documents";
import { getTemplate, buildDocumentHtml, canAccessTemplate, templateDataSource } from "@/lib/businessDocs/templates";
import { z } from "zod";

export async function GET() {
  try {
    const { companyId } = await requireCompany();
    const docs = await prisma.businessDocument.findMany({
      where: { companyId },
      select: { id: true, templateId: true, category: true, title: true, status: true, favorite: true, pinned: true, updatedAt: true, createdAt: true },
      orderBy: { updatedAt: "desc" },
    });
    return NextResponse.json(docs);
  } catch {
    return NextResponse.json({ error: "Неоторизиран достъп." }, { status: 401 });
  }
}

export async function POST(req: Request) {
  try {
    const { companyId, userId } = await requireCompany();
    const plan = await getPlan(companyId);
    if (!planHasFeature(plan, "doc_templates")) {
      return NextResponse.json({ error: "Модулът е достъпен само за планове Бизнес и Про." }, { status: 403 });
    }
    // entityId = избраният контрагент според източника на шаблона (клиент/служител/
    // доставчик). clientId се приема за обратна съвместимост (стари извиквания).
    const { templateId, clientId, entityId } = z.object({
      templateId: z.string(),
      clientId: z.string().optional().nullable(),
      entityId: z.string().optional().nullable(),
    }).parse(await req.json());
    const template = getTemplate(templateId);
    if (!template) return NextResponse.json({ error: "Невалиден шаблон." }, { status: 400 });

    const company = await prisma.company.findUnique({ where: { id: companyId } });
    if (!canAccessTemplate(template.id, company?.eik ?? null)) return NextResponse.json({ error: "Нямате достъп до този шаблон." }, { status: 403 });

    // Всеки шаблон „знае" източника си → избираме правилния контрагент (company-scoped).
    const source = templateDataSource(template);
    const selectedId = entityId ?? clientId ?? null;
    const client = source === "client" && selectedId ? await prisma.client.findFirst({ where: { id: selectedId, companyId } }) : null;
    const employee = source === "employee" && selectedId ? await prisma.employee.findFirst({ where: { id: selectedId, companyId } }) : null;
    const supplier = source === "supplier" && selectedId ? await prisma.supplier.findFirst({ where: { id: selectedId, companyId } }) : null;
    const vehicle = source === "vehicle" && selectedId ? await prisma.vehicle.findFirst({ where: { id: selectedId, companyId } }) : null;

    // Индивидуална номерация ПО КАТЕГОРИЯ, започваща от 0001 за всяка категория
    const count = await prisma.businessDocument.count({ where: { companyId, category: template.categoryId } });
    const docNumber = `${template.categoryId.toUpperCase()}-${new Date().getFullYear()}-${String(count + 1).padStart(4, "0")}`;
    const contentHtml = buildDocumentHtml(template, { company, client, employee, supplier, vehicle, docNumber, docDate: new Date() });

    const doc = await prisma.businessDocument.create({
      data: {
        companyId, templateId: template.id, templateVersion: template.version,
        category: template.categoryId, title: template.title, contentHtml, status: "draft",
      },
      select: { id: true },
    });
    await audit(companyId, userId, "create", "BusinessDocument", doc.id, template.title);
    return NextResponse.json({ id: doc.id });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Невалидни данни." }, { status: 400 });
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}
