import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fashionApiGuard } from "@/lib/fashion/access";
import { audit } from "@/lib/documents";
import { STYLE_PHOTO_KINDS } from "@/lib/fashion/styles";
import { z } from "zod";

const schema = z.object({
  url: z.string().min(1),
  kind: z.enum(STYLE_PHOTO_KINDS).optional(),
  caption: z.string().max(200).nullable().optional(),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await fashionApiGuard("manage_styles");
  if (!g.ok) return g.res;
  try {
    const { id } = await params;
    const style = await prisma.fashionStyle.findFirst({ where: { id, companyId: g.companyId }, select: { id: true } });
    if (!style) return NextResponse.json({ error: "Не е намерен." }, { status: 404 });
    const d = schema.parse(await req.json());
    const count = await prisma.fashionStylePhoto.count({ where: { styleId: id } });
    const photo = await prisma.fashionStylePhoto.create({
      data: { styleId: id, url: d.url, kind: d.kind ?? "product", caption: d.caption ?? null, sortOrder: count },
    });
    await audit(g.companyId, g.userId, "create", "FashionStylePhoto", photo.id, "Снимка на модел");
    return NextResponse.json(photo);
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Невалидни данни." }, { status: 400 });
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await fashionApiGuard("manage_styles");
  if (!g.ok) return g.res;
  const { id } = await params;
  const url = new URL(req.url);
  const photoId = url.searchParams.get("photoId");
  if (!photoId) return NextResponse.json({ error: "Липсва photoId." }, { status: 400 });
  // Изтриваме само снимка на модел на тази фирма.
  const photo = await prisma.fashionStylePhoto.findFirst({ where: { id: photoId, styleId: id, style: { companyId: g.companyId } }, select: { id: true } });
  if (!photo) return NextResponse.json({ error: "Не е намерена." }, { status: 404 });
  await prisma.fashionStylePhoto.delete({ where: { id: photoId } });
  await audit(g.companyId, g.userId, "delete", "FashionStylePhoto", photoId, "Изтрита снимка на модел");
  return NextResponse.json({ success: true });
}
