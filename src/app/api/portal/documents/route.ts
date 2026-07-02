import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireEmployee } from "@/lib/session";
import { validateUpload } from "@/lib/fileSecurity";
import { z } from "zod";

export async function GET() {
  try {
    const { employee } = await requireEmployee();
    const files = await prisma.employeeFile.findMany({
      where: { employeeId: employee.id },
      select: { id: true, name: true, docType: true, mimeType: true, size: true, uploadedAt: true },
      orderBy: { uploadedAt: "desc" },
    });
    return NextResponse.json(files);
  } catch {
    return NextResponse.json([], { status: 200 });
  }
}

const schema = z.object({
  name: z.string().min(1),
  docType: z.string().optional().nullable(),
  mimeType: z.string().min(1),
  size: z.number().int().positive(),
  dataUrl: z.string().min(1),
});

// Служителят качва документ за преглед от работодателя.
export async function POST(req: Request) {
  try {
    const { employee } = await requireEmployee();
    const data = schema.parse(await req.json());
    const v = validateUpload(data);
    if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 });
    const file = await prisma.employeeFile.create({
      data: { employeeId: employee.id, name: data.name, docType: data.docType ? `Служител: ${data.docType}` : "Изпратен от служител", mimeType: data.mimeType, size: data.size, dataUrl: data.dataUrl },
      select: { id: true, name: true, docType: true, mimeType: true, size: true, uploadedAt: true },
    });
    return NextResponse.json(file);
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Невалидни данни." }, { status: 400 });
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}
