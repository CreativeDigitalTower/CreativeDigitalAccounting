import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCompany } from "@/lib/session";
import { validateUpload } from "@/lib/fileSecurity";
import { z } from "zod";

const MAX = 5 * 1024 * 1024;

async function owned(companyId: string, clientId: string) {
  const c = await prisma.client.findUnique({ where: { id: clientId } });
  return c && c.companyId === companyId;
}

const schema = z.object({
  name: z.string().min(1),
  mimeType: z.string().min(1),
  size: z.number().int().positive().max(MAX, "Файлът е твърде голям (макс. 5 MB)."),
  dataUrl: z.string().min(1),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { companyId } = await requireCompany();
    const { id } = await params;
    if (!(await owned(companyId, id))) return NextResponse.json({ error: "Не е намерен." }, { status: 404 });
    const data = schema.parse(await req.json());
    const v = validateUpload(data);
    if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 });
    const file = await prisma.clientFile.create({ data: { clientId: id, ...data }, select: { id: true, name: true } });
    return NextResponse.json(file);
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.issues[0]?.message ?? "Невалидни данни." }, { status: 400 });
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { companyId } = await requireCompany();
    const { id } = await params;
    if (!(await owned(companyId, id))) return NextResponse.json({ error: "Не е намерен." }, { status: 404 });
    const fileId = new URL(req.url).searchParams.get("fileId");
    if (!fileId) return NextResponse.json({ error: "Липсва fileId." }, { status: 400 });
    await prisma.clientFile.delete({ where: { id: fileId } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}
