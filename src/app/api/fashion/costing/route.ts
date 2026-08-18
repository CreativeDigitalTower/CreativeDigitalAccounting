import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fashionApiGuard, getFashionSettings } from "@/lib/fashion/access";
import { audit } from "@/lib/documents";
import { resolveQuantity } from "@/lib/fashion/bom";
import { totalMinutes } from "@/lib/fashion/operations";
import {
  directLabor, overheadCost, manufacturingCost, fullyLoadedCost, commercialTotal, margins, isPackagingCategory,
} from "@/lib/fashion/costing";
import { z } from "zod";

const D = (n: number) => Math.round(n * 10000) / 10000;

async function buildBreakdown(companyId: string, styleId: string, size: string | null, color: string | null) {
  const [settings, bom, ops, costing] = await Promise.all([
    getFashionSettings(companyId),
    prisma.fashionBomItem.findMany({ where: { companyId, styleId }, include: { overrides: true, material: { select: { avgCost: true, category: { select: { name: true } } } } } }),
    prisma.fashionOperation.findMany({ where: { companyId, styleId }, select: { expectedMinutes: true } }),
    prisma.fashionStyleCosting.findUnique({ where: { styleId } }),
  ]);

  let direct = 0, packaging = 0;
  for (const b of bom) {
    const q = resolveQuantity(b.quantity, b.overrides.map((o) => ({ size: o.size, color: o.color, quantity: o.quantity })), size, color);
    const cost = D(q * b.material.avgCost);
    if (isPackagingCategory(b.material.category?.name)) packaging += cost; else direct += cost;
  }
  direct = D(direct); packaging = D(packaging);

  const minutes = totalMinutes(ops);
  const labor = directLabor(minutes, settings.laborHourlyRate);
  const overhead = overheadCost(settings.overheadMethod, settings.overheadValue, labor);
  const manufacturing = manufacturingCost({ directMaterials: direct, packaging, labor, overhead });

  const commercial = {
    marketing: costing?.marketingAlloc ?? 0, paymentFees: costing?.paymentFees ?? 0, fulfillment: costing?.fulfillment ?? 0,
    returnsAllowance: costing?.returnsAllowance ?? 0, logistics: costing?.logistics ?? 0, other: costing?.otherAlloc ?? 0,
  };
  const loaded = fullyLoadedCost(manufacturing, commercial);
  const selling = costing?.sellingPrice ?? costing?.retailPrice ?? 0;
  return {
    directMaterials: direct, packaging, minutes, labor, overhead, overheadMethod: settings.overheadMethod,
    manufacturing, commercial, commercialTotal: commercialTotal(commercial), fullyLoaded: loaded,
    retailPrice: costing?.retailPrice ?? null, sellingPrice: costing?.sellingPrice ?? null,
    marginsManufacturing: margins(selling, manufacturing), marginsLoaded: margins(selling, loaded),
  };
}

// GET ?styleId=…(&size=&color=) → пълна себестойностна разбивка. Без styleId → обзор.
export async function GET(req: Request) {
  const g = await fashionApiGuard("view_costing");
  if (!g.ok) return g.res;
  const url = new URL(req.url);
  const styleId = url.searchParams.get("styleId") || undefined;
  const size = url.searchParams.get("size") || null;
  const color = url.searchParams.get("color") || null;

  if (!styleId) {
    const styles = await prisma.fashionStyle.findMany({ where: { companyId: g.companyId }, select: { id: true, code: true, name: true, status: true }, orderBy: { updatedAt: "desc" }, take: 1000 });
    const rows = await Promise.all(styles.map(async (s) => {
      const b = await buildBreakdown(g.companyId, s.id, null, null);
      return { id: s.id, code: s.code, name: s.name, status: s.status, manufacturing: b.manufacturing, fullyLoaded: b.fullyLoaded, retailPrice: b.retailPrice, grossMarginPct: b.marginsManufacturing.grossMarginPct };
    }));
    return NextResponse.json(rows);
  }

  const style = await prisma.fashionStyle.findFirst({ where: { id: styleId, companyId: g.companyId }, select: { id: true, code: true, name: true, sizes: true, colors: true } });
  if (!style) return NextResponse.json({ error: "Моделът не е намерен." }, { status: 404 });
  const breakdown = await buildBreakdown(g.companyId, styleId, size, color);
  return NextResponse.json({ style, size, color, ...breakdown });
}

const schema = z.object({
  styleId: z.string(),
  retailPrice: z.number().min(0).nullable().optional(),
  sellingPrice: z.number().min(0).nullable().optional(),
  marketingAlloc: z.number().min(0).optional(),
  paymentFees: z.number().min(0).optional(),
  fulfillment: z.number().min(0).optional(),
  returnsAllowance: z.number().min(0).optional(),
  logistics: z.number().min(0).optional(),
  otherAlloc: z.number().min(0).optional(),
});

// Записва ценова/алокационна конфигурация на модел (upsert).
export async function POST(req: Request) {
  const g = await fashionApiGuard("manage_costing");
  if (!g.ok) return g.res;
  try {
    const d = schema.parse(await req.json());
    const style = await prisma.fashionStyle.findFirst({ where: { id: d.styleId, companyId: g.companyId }, select: { id: true } });
    if (!style) return NextResponse.json({ error: "Моделът не е намерен." }, { status: 404 });
    const { styleId, ...rest } = d;
    await prisma.fashionStyleCosting.upsert({
      where: { styleId }, create: { companyId: g.companyId, styleId, ...rest }, update: rest,
    });
    await audit(g.companyId, g.userId, "update", "FashionStyleCosting", styleId, "Себестойност/цени");
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Невалидни данни." }, { status: 400 });
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}
