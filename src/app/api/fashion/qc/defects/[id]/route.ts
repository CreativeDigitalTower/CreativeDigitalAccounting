import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fashionApiGuard } from "@/lib/fashion/access";
import { recomputeOrderCounts } from "@/lib/fashion/qcService";
import { audit } from "@/lib/documents";
import { DEFECT_DISPOSITIONS } from "@/lib/fashion/qc";
import { z } from "zod";

// Промяна на решението (disposition) за дефект → преизчислява броевете на поръчката.
const schema = z.object({ disposition: z.enum(DEFECT_DISPOSITIONS) });

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await fashionApiGuard("manage_qc");
  if (!g.ok) return g.res;
  try {
    const { id } = await params;
    const defect = await prisma.fashionDefect.findFirst({ where: { id, companyId: g.companyId }, select: { id: true, productionOrderId: true } });
    if (!defect) return NextResponse.json({ error: "Не е намерен." }, { status: 404 });
    const d = schema.parse(await req.json());
    await prisma.$transaction(async (tx) => {
      await tx.fashionDefect.update({ where: { id }, data: { disposition: d.disposition } });
      await recomputeOrderCounts(tx, g.companyId, defect.productionOrderId);
    });
    await audit(g.companyId, g.userId, "update", "FashionDefect", id, `Дефект → ${d.disposition}`);
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Невалидни данни." }, { status: 400 });
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}
