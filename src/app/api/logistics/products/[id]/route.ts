import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logisticsApiGuard } from "@/lib/logistics/access";
import { audit } from "@/lib/documents";
import { normalizeProductKey, normalizeMaterialCode } from "@/lib/logistics/normalize";
import { z } from "zod";

async function owned(companyId: string, id: string) {
  return prisma.logisticsProduct.findFirst({ where: { id, companyId }, select: { id: true } });
}

const patchSchema = z.object({
  canonicalName: z.string().min(1).max(200).optional(),
  materialCode: z.string().max(60).nullable().optional(),
  unit: z.string().min(1).max(20).optional(),
  packaging: z.string().max(120).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
  active: z.boolean().optional(),
  // добавяне/премахване на alias
  addAlias: z.string().min(1).max(200).optional(),
  removeAliasId: z.string().optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await logisticsApiGuard("manage_rates");
  if (!g.ok) return g.res;
  try {
    const { id } = await params;
    if (!(await owned(g.companyId, id))) return NextResponse.json({ error: "Не е намерен." }, { status: 404 });
    const d = patchSchema.parse(await req.json());

    // Material code uniqueness (по фирма) — ако е зададен, да не дублира друг продукт.
    if (d.materialCode) {
      const norm = normalizeMaterialCode(d.materialCode);
      const others = await prisma.logisticsProduct.findMany({
        where: { companyId: g.companyId, id: { not: id }, materialCode: { not: null } },
        select: { materialCode: true },
      });
      if (others.some((p) => normalizeMaterialCode(p.materialCode) === norm)) {
        return NextResponse.json({ error: "Този material code вече е зает от друг продукт." }, { status: 409 });
      }
    }

    const data: Record<string, unknown> = {};
    if (d.canonicalName !== undefined) {
      data.canonicalName = d.canonicalName;
      const nn = normalizeProductKey(d.canonicalName);
      const clash = await prisma.logisticsProduct.findFirst({ where: { companyId: g.companyId, normalizedName: nn, id: { not: id } }, select: { id: true } });
      if (clash) return NextResponse.json({ error: "Друг продукт вече ползва това наименование." }, { status: 409 });
      data.normalizedName = nn;
    }
    if (d.materialCode !== undefined) data.materialCode = d.materialCode?.trim() || null;
    if (d.unit !== undefined) data.unit = d.unit;
    if (d.packaging !== undefined) data.packaging = d.packaging;
    if (d.notes !== undefined) data.notes = d.notes;
    if (d.active !== undefined) data.active = d.active;

    if (Object.keys(data).length) await prisma.logisticsProduct.update({ where: { id }, data });

    if (d.addAlias) {
      const an = normalizeProductKey(d.addAlias);
      const exists = await prisma.logisticsProductAlias.findUnique({ where: { companyId_normalizedAlias: { companyId: g.companyId, normalizedAlias: an } }, select: { id: true } });
      if (!exists) await prisma.logisticsProductAlias.create({ data: { companyId: g.companyId, productId: id, alias: d.addAlias, normalizedAlias: an } });
    }
    if (d.removeAliasId) {
      await prisma.logisticsProductAlias.deleteMany({ where: { id: d.removeAliasId, productId: id } });
    }

    await audit(g.companyId, g.userId, "update", "LogisticsProduct", id, "Редакция на продукт");
    const fresh = await prisma.logisticsProduct.findUnique({
      where: { id },
      select: { id: true, canonicalName: true, materialCode: true, unit: true, packaging: true, active: true, notes: true, aliases: { select: { id: true, alias: true } } },
    });
    return NextResponse.json(fresh);
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Невалидни данни." }, { status: 400 });
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}
