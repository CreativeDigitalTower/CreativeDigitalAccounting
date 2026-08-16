import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logisticsApiGuard, exportSetReadRole } from "@/lib/logistics/access";
import { audit } from "@/lib/documents";
import { z } from "zod";

// Редакция е само за продавача (set.companyId). За четене се авторизира отделно.
async function loadDoc(companyId: string, docId: string) {
  return prisma.exportDocument.findFirst({
    where: { id: docId, set: { companyId } },
    select: { id: true, setId: true, docType: true, data: true, overridden: true, status: true, finalizedAt: true },
  });
}

export async function GET(_req: Request, { params }: { params: Promise<{ docId: string }> }) {
  const g = await logisticsApiGuard("view_logistics");
  if (!g.ok) return g.res;
  const { docId } = await params;
  const doc = await prisma.exportDocument.findUnique({
    where: { id: docId },
    select: { id: true, setId: true, docType: true, data: true, overridden: true, status: true, finalizedAt: true, set: { select: { companyId: true, buyerCompanyId: true } } },
  });
  if (!doc) return NextResponse.json({ error: "Не е намерен." }, { status: 404 });
  const role = await exportSetReadRole(g.companyId, doc.set);
  if (!role) return NextResponse.json({ error: "Няма достъп." }, { status: 403 });
  const { set: _set, ...rest } = doc;
  return NextResponse.json({ ...rest, viewerRole: role });
}

const schema = z.object({
  data: z.record(z.string(), z.unknown()).optional(), // редакция на snapshot-а → overridden
  finalize: z.boolean().optional(),
  reopen: z.boolean().optional(),                       // изрично отваряне на финализиран
});

export async function PATCH(req: Request, { params }: { params: Promise<{ docId: string }> }) {
  const g = await logisticsApiGuard("manage_documents");
  if (!g.ok) return g.res;
  try {
    const { docId } = await params;
    const existing = await loadDoc(g.companyId, docId);
    if (!existing) return NextResponse.json({ error: "Не е намерен." }, { status: 404 });
    const d = schema.parse(await req.json());

    // Финализиран документ не се редактира без изрично отваряне.
    if (existing.status === "finalized" && d.data && !d.reopen) {
      return NextResponse.json({ error: "Документът е финализиран. Отворете го за редакция изрично.", finalized: true }, { status: 409 });
    }

    const data: Record<string, unknown> = {};
    if (d.reopen && existing.status === "finalized") { data.status = "draft"; data.finalizedAt = null; data.finalizedById = null; }
    if (d.data) { data.data = d.data as object; data.overridden = true; }
    if (d.finalize) { data.status = "finalized"; data.finalizedAt = new Date(); data.finalizedById = g.userId; }

    const doc = await prisma.exportDocument.update({
      where: { id: docId }, data,
      select: { id: true, docType: true, data: true, overridden: true, status: true },
    });
    await audit(g.companyId, g.userId, d.finalize ? "finalize" : d.reopen ? "reopen" : "update", "ExportDocument", docId,
      `${existing.docType} — ${d.finalize ? "финализиран" : d.reopen ? "отворен за редакция" : "редакция"}`);
    return NextResponse.json(doc);
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Невалидни данни." }, { status: 400 });
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}
