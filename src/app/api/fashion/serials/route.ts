import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fashionApiGuard } from "@/lib/fashion/access";
import { audit } from "@/lib/documents";
import { nextSerial, serialStatusCounts, remainingEdition } from "@/lib/fashion/serialization";
import { z } from "zod";

// GET ?styleId=… → сериализираните бройки + броеве по статус + инфо за тиража.
export async function GET(req: Request) {
  const g = await fashionApiGuard("view_fashion");
  if (!g.ok) return g.res;
  const styleId = new URL(req.url).searchParams.get("styleId");
  if (!styleId) return NextResponse.json({ error: "Липсва styleId." }, { status: 400 });
  const style = await prisma.fashionStyle.findFirst({ where: { id: styleId, companyId: g.companyId }, select: { id: true, code: true, name: true, serialized: true, editionSize: true, colors: true, sizes: true } });
  if (!style) return NextResponse.json({ error: "Моделът не е намерен." }, { status: 404 });
  const units = await prisma.fashionSerializedUnit.findMany({ where: { companyId: g.companyId, styleId }, orderBy: { serial: "asc" } });
  return NextResponse.json({
    style, units, counts: serialStatusCounts(units),
    issued: units.length, remaining: remainingEdition(style.editionSize, units.length),
  });
}

// POST → генерира N последователни серийни номера (ограничено до тиража, ако е зададен).
const schema = z.object({
  styleId: z.string(),
  count: z.number().int().min(1).max(1000).optional(),
  color: z.string().max(80).nullable().optional(),
  size: z.string().max(40).nullable().optional(),
  productionBatch: z.string().max(80).nullable().optional(),
});

export async function POST(req: Request) {
  const g = await fashionApiGuard("manage_production");
  if (!g.ok) return g.res;
  try {
    const d = schema.parse(await req.json());
    const style = await prisma.fashionStyle.findFirst({ where: { id: d.styleId, companyId: g.companyId }, select: { id: true, serialized: true, editionSize: true } });
    if (!style) return NextResponse.json({ error: "Моделът не е намерен." }, { status: 404 });
    if (!style.serialized) return NextResponse.json({ error: "Моделът не е сериализиран." }, { status: 400 });

    const created = await prisma.$transaction(async (tx) => {
      const existing = await tx.fashionSerializedUnit.findMany({ where: { styleId: d.styleId }, select: { serial: true } });
      const remaining = remainingEdition(style.editionSize, existing.length);
      const want = d.count ?? 1;
      const n = Math.min(want, remaining);
      if (n <= 0) return { n: 0, remaining };
      let serial = nextSerial(existing.map((x) => x.serial));
      const rows = [];
      for (let i = 0; i < n; i++) rows.push({ companyId: g.companyId, styleId: d.styleId, serial: serial++, color: d.color ?? null, size: d.size ?? null, productionBatch: d.productionBatch ?? null, createdById: g.userId });
      await tx.fashionSerializedUnit.createMany({ data: rows });
      return { n, remaining: remaining - n };
    });
    if (created.n === 0) return NextResponse.json({ error: "Тиражът е изчерпан." }, { status: 400 });
    await audit(g.companyId, g.userId, "create", "FashionSerializedUnit", d.styleId, `Генерирани ${created.n} серийни номера`);
    return NextResponse.json({ created: created.n, remaining: created.remaining });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Невалидни данни." }, { status: 400 });
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}
