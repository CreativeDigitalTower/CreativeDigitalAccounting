import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logisticsApiGuard, groupCounterparties } from "@/lib/logistics/access";
import { isLinkedBuyer } from "@/lib/logistics/clientScope";
import { z } from "zod";

// Клиентите на СВЪРЗАНАТА (buyer) фирма — за полето „До:" в Испратницата (§1/§2).
// Cross-company lookup е позволен САМО ако buyer е linked фирма в същата CompanyGroup
// (§3); companyId НЕ се вярва наивно от frontend — валидира се server-side.
async function assertLinkedBuyer(activeCompanyId: string, buyerCompanyId: string): Promise<boolean> {
  const cps = await groupCounterparties(activeCompanyId);
  return isLinkedBuyer(buyerCompanyId, cps.map((c) => c.id));
}

export async function GET(req: Request) {
  const g = await logisticsApiGuard("view_logistics");
  if (!g.ok) return g.res;
  const buyerCompanyId = new URL(req.url).searchParams.get("companyId") ?? "";
  if (!buyerCompanyId) return NextResponse.json([]);
  if (!(await assertLinkedBuyer(g.companyId, buyerCompanyId))) {
    return NextResponse.json({ error: "Фирмата не е свързана в групата." }, { status: 403 });
  }
  const clients = await prisma.client.findMany({
    where: { companyId: buyerCompanyId, status: { notIn: ["inactive", "lost"] } },
    select: { id: true, name: true }, orderBy: { name: "asc" }, take: 2000,
  });
  return NextResponse.json(clients);
}

const createSchema = z.object({ companyId: z.string().min(1), name: z.string().min(2).max(200) });

// Създаване на нов краен клиент в CRM на buyer фирмата (SEM), не на активната (§6).
export async function POST(req: Request) {
  const g = await logisticsApiGuard("manage_documents");
  if (!g.ok) return g.res;
  try {
    const d = createSchema.parse(await req.json());
    if (!(await assertLinkedBuyer(g.companyId, d.companyId))) {
      return NextResponse.json({ error: "Фирмата не е свързана в групата." }, { status: 403 });
    }
    const name = d.name.trim();
    // Dedup по име в рамките на buyer фирмата (не създаваме дубликат, §10).
    const existing = await prisma.client.findFirst({ where: { companyId: d.companyId, name: { equals: name, mode: "insensitive" } }, select: { id: true, name: true } });
    if (existing) return NextResponse.json(existing);
    const created = await prisma.client.create({ data: { companyId: d.companyId, name }, select: { id: true, name: true } });
    return NextResponse.json(created);
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.issues[0]?.message ?? "Невалидни данни." }, { status: 400 });
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}
