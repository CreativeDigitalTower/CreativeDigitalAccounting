import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCompany, getPlan } from "@/lib/session";
import { planHasFeature } from "@/lib/constants";
import { audit } from "@/lib/documents";
import { getTemplate, buildDocumentHtml } from "@/lib/businessDocs/templates";
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
    const { templateId } = z.object({ templateId: z.string() }).parse(await req.json());
    const template = getTemplate(templateId);
    if (!template) return NextResponse.json({ error: "Невалиден шаблон." }, { status: 400 });

    const company = await prisma.company.findUnique({ where: { id: companyId } });
    // Индивидуална номерация ПО КАТЕГОРИЯ, започваща от 0001 за всяка категория
    const count = await prisma.businessDocument.count({ where: { companyId, category: template.categoryId } });
    const docNumber = `${template.categoryId.toUpperCase()}-${new Date().getFullYear()}-${String(count + 1).padStart(4, "0")}`;
    const contentHtml = buildDocumentHtml(template, { company, docNumber, docDate: new Date() });

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
