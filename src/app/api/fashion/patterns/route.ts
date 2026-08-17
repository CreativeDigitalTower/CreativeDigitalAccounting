import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { fashionApiGuard } from "@/lib/fashion/access";
import { audit } from "@/lib/documents";
import { nextPatternVersion } from "@/lib/fashion/styles";
import { z } from "zod";

// GET ?styleId=… → версиите на кройката за модел; иначе последна версия по модел (списък).
export async function GET(req: Request) {
  const g = await fashionApiGuard("view_fashion");
  if (!g.ok) return g.res;
  const styleId = new URL(req.url).searchParams.get("styleId") || undefined;
  if (styleId) {
    const patterns = await prisma.fashionPattern.findMany({
      where: { companyId: g.companyId, styleId }, orderBy: { version: "desc" },
    });
    return NextResponse.json(patterns);
  }
  // Обзор: моделите + готовност на кройката (последна версия).
  const styles = await prisma.fashionStyle.findMany({
    where: { companyId: g.companyId },
    select: { id: true, code: true, name: true, patterns: { orderBy: { version: "desc" }, take: 1 } },
    orderBy: { updatedAt: "desc" }, take: 2000,
  });
  return NextResponse.json(styles.map((s) => ({
    id: s.id, code: s.code, name: s.name,
    latest: s.patterns[0] ? { version: s.patterns[0].version, status: s.patterns[0].status, hasPaper: s.patterns[0].hasPaper, hasDigital: s.patterns[0].hasDigital, hasMarker: s.patterns[0].hasMarker } : null,
  })));
}

const schema = z.object({
  styleId: z.string(),
  size: z.string().max(40).nullable().optional(),
  hasPaper: z.boolean().optional(),
  hasDigital: z.boolean().optional(),
  hasMarker: z.boolean().optional(),
  fileUrl: z.string().nullable().optional(),
  fileName: z.string().max(200).nullable().optional(),
  mimeType: z.string().max(100).nullable().optional(),
  photoUrl: z.string().nullable().optional(),
  author: z.string().max(120).nullable().optional(),
  note: z.string().max(2000).nullable().optional(),
});

// Нова ВЕРСИЯ на кройка (никога не презаписва стара). Версията се изчислява транзакционно;
// при рядка гонка unique([styleId, version]) хваща дубликата.
export async function POST(req: Request) {
  const g = await fashionApiGuard("manage_patterns");
  if (!g.ok) return g.res;
  try {
    const d = schema.parse(await req.json());
    const style = await prisma.fashionStyle.findFirst({ where: { id: d.styleId, companyId: g.companyId }, select: { id: true } });
    if (!style) return NextResponse.json({ error: "Моделът не е намерен." }, { status: 404 });

    const pattern = await prisma.$transaction(async (tx) => {
      const versions = await tx.fashionPattern.findMany({ where: { styleId: d.styleId }, select: { version: true } });
      const version = nextPatternVersion(versions.map((v) => v.version));
      return tx.fashionPattern.create({
        data: {
          companyId: g.companyId, styleId: d.styleId, version, size: d.size ?? null,
          hasPaper: d.hasPaper ?? false, hasDigital: d.hasDigital ?? false, hasMarker: d.hasMarker ?? false,
          fileUrl: d.fileUrl ?? null, fileName: d.fileName ?? null, mimeType: d.mimeType ?? null,
          photoUrl: d.photoUrl ?? null, author: d.author ?? null, note: d.note ?? null, createdById: g.userId,
        },
      });
    });
    await audit(g.companyId, g.userId, "create", "FashionPattern", pattern.id, `Кройка v${pattern.version}`);
    return NextResponse.json(pattern);
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") return NextResponse.json({ error: "Конфликт на версии — опитайте пак." }, { status: 409 });
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Невалидни данни." }, { status: 400 });
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}
