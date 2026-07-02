import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireFeature } from "@/lib/session";
import { audit } from "@/lib/documents";
import { validateUpload } from "@/lib/fileSecurity";
import { z } from "zod";

const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

const schema = z.object({
  name: z.string().min(1),
  category: z.string().optional().nullable(),
  mimeType: z.string().min(1),
  size: z.number().int().positive().max(MAX_SIZE, "Файлът е твърде голям (макс. 5 MB)."),
  dataUrl: z.string().min(1),
});

export async function GET() {
  try {
    const { companyId } = await requireFeature("archive");
    const files = await prisma.archiveFile.findMany({
      where: { companyId },
      select: { id: true, name: true, category: true, mimeType: true, size: true, uploadedAt: true },
      orderBy: { uploadedAt: "desc" },
    });
    return NextResponse.json(files);
  } catch {
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { companyId, userId } = await requireFeature("archive");
    const data = schema.parse(await req.json());
    const v = validateUpload(data);
    if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 });

    const file = await prisma.archiveFile.create({
      data: { companyId, name: data.name, category: data.category ?? null, mimeType: data.mimeType, size: data.size, dataUrl: data.dataUrl },
      select: { id: true, name: true },
    });
    await audit(companyId, userId, "create", "ArchiveFile", file.id, data.name);
    return NextResponse.json({ id: file.id });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.issues[0]?.message ?? "Невалидни данни." }, { status: 400 });
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}
