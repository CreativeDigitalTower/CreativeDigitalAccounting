import { NextResponse } from "next/server";
import { Prisma, type DocumentStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { logisticsApiGuard } from "@/lib/logistics/access";
import { sumMoney } from "@/lib/logistics/money";
import { resolveReceivedInvoice } from "@/lib/logistics/received";

/**
 * READ-ONLY списък на MK фактурите, свързани с експортните доставки на АКТИВНАТА фирма
 * (тя е продавачът). Фактурите са СОБСТВЕНОСТ на MK фирмата — тук само се четат през
 * explicit relation (sourceExportSet.companyId = active). Няма cross-company leak: показват
 * се само фактури, линкнати към доставки на активната фирма. Document = source of truth;
 * легаси MkInvoice fallback (не-bridge-нат).
 */
export async function GET(req: Request) {
  const g = await logisticsApiGuard("view_logistics");
  if (!g.ok) return g.res;
  const sp = new URL(req.url).searchParams;
  const q = (sp.get("q") ?? "").trim();
  const status = sp.get("status") ?? "";
  const page = Math.max(1, Number(sp.get("page")) || 1);
  const pageSize = Math.min(100, Math.max(5, Number(sp.get("pageSize")) || 25));
  const year = Number(sp.get("year")) || 0;
  const month = sp.get("month") != null ? Number(sp.get("month")) : NaN;
  let gte: Date | undefined, lte: Date | undefined;
  if (year) { gte = new Date(year, Number.isNaN(month) ? 0 : month, 1); lte = new Date(year, Number.isNaN(month) ? 12 : month + 1, 0, 23, 59, 59); }

  const setLink = { is: { companyId: g.companyId, deletedAt: null } };
  const docWhere: Prisma.DocumentWhereInput = {
    type: "invoice", deletedAt: null, status: { not: "cancelled" }, sourceExportSet: setLink,
    ...(status ? { status: status as DocumentStatus } : {}),
    ...(gte || lte ? { issueDate: { ...(gte ? { gte } : {}), ...(lte ? { lte } : {}) } } : {}),
    ...(q ? { OR: [
      { number: { contains: q, mode: "insensitive" } },
      { client: { name: { contains: q, mode: "insensitive" } } },
      { sourceExportSet: { is: { invoiceNumber: { contains: q, mode: "insensitive" } } } },
    ] } : {}),
  };

  const docs = await prisma.document.findMany({
    where: docWhere,
    select: {
      id: true, number: true, issueDate: true, currency: true, status: true, paidAmount: true,
      company: { select: { name: true } }, client: { select: { name: true } },
      lines: { select: { quantity: true, unitPrice: true, vatRate: true, lineTotal: true } },
      sourceExportSet: { select: { id: true, invoiceNumber: true, destination: true, truckRegSnapshot: true, trailerReg: true, quantity: true, unit: true } },
    },
    orderBy: { issueDate: "desc" }, take: 1000,
  });

  // Легаси MkInvoice — само за доставки без стандартна фактура и без bridge (§18/§23).
  const legacy = status ? [] : await prisma.mkInvoice.findMany({
    where: { sourceExportSet: setLink, documentId: null, ...(gte || lte ? { date: { ...(gte ? { gte } : {}), ...(lte ? { lte } : {}) } } : {}) },
    select: {
      id: true, number: true, date: true, currency: true,
      company: { select: { name: true } }, client: { select: { name: true } },
      lines: { select: { lineTotal: true } },
      sourceExportSet: { select: { id: true, invoiceNumber: true, destination: true, truckRegSnapshot: true, trailerReg: true, quantity: true, unit: true } },
    },
    orderBy: { date: "desc" }, take: 1000,
  });
  const docSetIds = new Set(docs.map((d) => d.sourceExportSet?.id).filter(Boolean));

  type Row = {
    id: string; kind: "document" | "mk"; number: string; date: string | null; issuer: string; client: string;
    setId: string | null; setNumber: string | null; destination: string | null; truck: string | null;
    quantity: number | null; unit: string | null; net: number; currency: string; paymentStatus: string | null;
  };
  const rows: Row[] = [];
  for (const d of docs) {
    const truck = [d.sourceExportSet?.truckRegSnapshot, d.sourceExportSet?.trailerReg].filter(Boolean).join(" / ") || null;
    rows.push({
      id: d.id, kind: "document", number: d.number, date: d.issueDate?.toISOString() ?? null,
      issuer: d.company?.name ?? "—", client: d.client?.name ?? "—",
      setId: d.sourceExportSet?.id ?? null, setNumber: d.sourceExportSet?.invoiceNumber ?? null,
      destination: d.sourceExportSet?.destination ?? null, truck, quantity: d.sourceExportSet?.quantity ?? null, unit: d.sourceExportSet?.unit ?? null,
      net: sumMoney(d.lines.map((l) => l.lineTotal)), currency: d.currency, paymentStatus: d.status,
    });
  }
  for (const m of legacy) {
    if (m.sourceExportSet && docSetIds.has(m.sourceExportSet.id)) continue; // Document има приоритет
    if (!resolveReceivedInvoice(null, { id: m.id, number: m.number, documentId: null })) continue;
    const truck = [m.sourceExportSet?.truckRegSnapshot, m.sourceExportSet?.trailerReg].filter(Boolean).join(" / ") || null;
    rows.push({
      id: m.id, kind: "mk", number: m.number, date: m.date?.toISOString() ?? null,
      issuer: m.company?.name ?? "—", client: m.client?.name ?? "—",
      setId: m.sourceExportSet?.id ?? null, setNumber: m.sourceExportSet?.invoiceNumber ?? null,
      destination: m.sourceExportSet?.destination ?? null, truck, quantity: m.sourceExportSet?.quantity ?? null, unit: m.sourceExportSet?.unit ?? null,
      net: sumMoney(m.lines.map((l) => l.lineTotal)), currency: m.currency, paymentStatus: null,
    });
  }
  rows.sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));

  // KPI: брой + суми ПО ВАЛУТА (без смесване, §C1/§20) + разбивка по payment status.
  const byCurrency: Record<string, number> = {};
  const byStatus: Record<string, number> = { paid: 0, partially_paid: 0, unpaid: 0 };
  for (const r of rows) {
    byCurrency[r.currency] = Math.round(((byCurrency[r.currency] ?? 0) + r.net) * 100) / 100;
    if (r.paymentStatus === "paid") byStatus.paid++;
    else if (r.paymentStatus === "partially_paid") byStatus.partially_paid++;
    else byStatus.unpaid++;
  }
  const total = rows.length;
  const paged = rows.slice((page - 1) * pageSize, page * pageSize);
  return NextResponse.json({ rows: paged, total, page, pageSize, kpi: { total, byCurrency, byStatus } });
}
