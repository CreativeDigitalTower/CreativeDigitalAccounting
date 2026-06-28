import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCompany } from "@/lib/session";
import { z } from "zod";

async function owned(companyId: string, clientId: string) {
  const c = await prisma.client.findUnique({ where: { id: clientId } });
  return c && c.companyId === companyId;
}

const schema = z.object({
  name: z.string().min(1),
  position: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().optional().nullable(),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { companyId } = await requireCompany();
    const { id } = await params;
    if (!(await owned(companyId, id))) return NextResponse.json({ error: "Не е намерен." }, { status: 404 });
    const data = schema.parse(await req.json());
    const contact = await prisma.clientContact.create({ data: { clientId: id, ...data } });
    return NextResponse.json(contact);
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Невалидни данни." }, { status: 400 });
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { companyId } = await requireCompany();
    const { id } = await params;
    if (!(await owned(companyId, id))) return NextResponse.json({ error: "Не е намерен." }, { status: 404 });
    const contactId = new URL(req.url).searchParams.get("contactId");
    if (!contactId) return NextResponse.json({ error: "Липсва contactId." }, { status: 400 });
    await prisma.clientContact.delete({ where: { id: contactId } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}
