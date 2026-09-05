import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logisticsApiGuard } from "@/lib/logistics/access";
import { isPeriodKey, resolvePeriodRange, prismaDateFilter } from "@/lib/logistics/period";
import { sortClients, clientKpis, isClientSort, type ClientStatRow } from "@/lib/logistics/clientStats";
import { resolveFinalClientCompanyId, assertClientCompanyInGroup } from "@/lib/logistics/finalClient";
import { z } from "zod";

// „Клиенти (логистика)" — крайните MK клиенти (CRM на SEM, §20) с автоматична статистика
// от валидните Export Deliveries: брой доставки + количество + последна доставка (§16-§18).
// Всичко derived server-side (groupBy/aggregate) — без manual counters (§19/§44), без
// зареждане на всички доставки (§37). Soft-deleted НЕ участва (§42).
export async function GET(req: Request) {
  const g = await logisticsApiGuard("view_analytics");
  if (!g.ok) return g.res;
  const sp = new URL(req.url).searchParams;
  const periodKey = isPeriodKey(sp.get("period")) ? sp.get("period")! : "all_time";
  const range = resolvePeriodRange(periodKey as never, { from: sp.get("from"), to: sp.get("to") });
  const dateFilter = prismaDateFilter(range);
  const hasDate = Object.keys(dateFilter).length > 0;
  const sort = isClientSort(sp.get("sort")) ? sp.get("sort")! : "deliveries_desc";
  const q = (sp.get("q") ?? "").trim().toLowerCase();

  const finalCompanyId = await resolveFinalClientCompanyId(g.companyId);
  const sel = { id: true, name: true, eik: true, city: true, phone: true, contactEmail: true } as const;

  const [base, agg] = await Promise.all([
    // Базов списък: всички крайни клиенти (вкл. с 0 доставки → новосъздадените се виждат, §50).
    prisma.client.findMany({ where: { companyId: finalCompanyId }, select: sel, take: 3000, orderBy: { name: "asc" } }),
    // Агрегат по краен клиент за доставки, в които участва активната фирма (продавач или buyer).
    prisma.exportDocumentSet.groupBy({
      by: ["clientId"],
      where: { OR: [{ companyId: g.companyId }, { buyerCompanyId: g.companyId }], deletedAt: null, clientId: { not: null }, ...(hasDate ? { shipmentDate: dateFilter } : {}) },
      _count: { _all: true }, _sum: { quantity: true }, _max: { shipmentDate: true, invoiceDate: true },
    }),
  ]);

  const round3 = (n: number) => Math.round(n * 1000) / 1000;
  const aggMap = new Map(agg.map((a) => [a.clientId as string, {
    deliveries: a._count._all,
    quantity: round3(a._sum.quantity ?? 0),
    lastDelivery: (a._max.shipmentDate ?? a._max.invoiceDate ?? null)?.toISOString() ?? null,
  }]));

  // Клиенти с доставки, но извън базовия списък (напр. legacy запис в друга фирма от групата).
  const baseIds = new Set(base.map((c) => c.id));
  const extraIds = [...aggMap.keys()].filter((id) => !baseIds.has(id));
  const extra = extraIds.length ? await prisma.client.findMany({ where: { id: { in: extraIds } }, select: sel }) : [];

  const all = [...base, ...extra].map((c): ClientStatRow & { city: string | null; phone: string | null; contactEmail: string | null } => ({
    id: c.id, name: c.name, eik: c.eik, city: c.city, phone: c.phone, contactEmail: c.contactEmail,
    deliveries: aggMap.get(c.id)?.deliveries ?? 0,
    quantity: aggMap.get(c.id)?.quantity ?? 0,
    lastDelivery: aggMap.get(c.id)?.lastDelivery ?? null,
  }));

  const kpi = clientKpis(all); // KPI върху пълния набор (не се влияе от текстовото търсене)
  const searchMatch = (c: (typeof all)[number]) => !q || [c.name, c.eik, c.city, c.phone, c.contactEmail].some((v) => (v ?? "").toLowerCase().includes(q));
  const rows = sortClients(all.filter(searchMatch), sort as never);

  return NextResponse.json({ finalCompanyId, sort, period: { key: periodKey }, kpi, rows });
}

const createSchema = z.object({
  companyId: z.string().optional(),
  name: z.string().min(2).max(200),
  eik: z.string().max(40).nullable().optional(),
  vatNumber: z.string().max(40).nullable().optional(),
  address: z.string().max(300).nullable().optional(),
  city: z.string().max(120).nullable().optional(),
  country: z.string().max(120).nullable().optional(),
  phone: z.string().max(60).nullable().optional(),
  contactEmail: z.string().max(160).nullable().optional(),
  contactPerson: z.string().max(160).nullable().optional(),
});

// Създаване на нов краен клиент в CRM на SEM (§26-§28/§32). Company scope се валидира
// server-side в рамките на групата; dedup по ЕИК/име → връща съществуващия (не дублира).
export async function POST(req: Request) {
  const g = await logisticsApiGuard("manage_documents");
  if (!g.ok) return g.res;
  try {
    const d = createSchema.parse(await req.json());
    const finalCompanyId = d.companyId || (await resolveFinalClientCompanyId(g.companyId));
    if (!(await assertClientCompanyInGroup(g.companyId, finalCompanyId))) {
      return NextResponse.json({ error: "Фирмата не е свързана в групата." }, { status: 403 });
    }
    const name = d.name.trim();
    const eik = d.eik?.trim() || null;
    const dup = await prisma.client.findFirst({
      where: { companyId: finalCompanyId, OR: [...(eik ? [{ eik }] : []), { name: { equals: name, mode: "insensitive" as const } }] },
      select: { id: true, name: true, eik: true },
    });
    if (dup) return NextResponse.json({ ...dup, duplicate: true });
    const created = await prisma.client.create({
      data: {
        companyId: finalCompanyId, name, eik,
        vatNumber: d.vatNumber?.trim() || null, address: d.address?.trim() || null, city: d.city?.trim() || null,
        country: d.country?.trim() || null, phone: d.phone?.trim() || null, contactEmail: d.contactEmail?.trim() || null,
        contactPerson: d.contactPerson?.trim() || null,
      },
      select: { id: true, name: true, eik: true },
    });
    return NextResponse.json(created);
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.issues[0]?.message ?? "Невалидни данни." }, { status: 400 });
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}
