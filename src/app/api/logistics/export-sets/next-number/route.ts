import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logisticsApiGuard } from "@/lib/logistics/access";
import { SEQ_SCOPE, formatSequenceNumber, EXPORT_INVOICE_FORMAT } from "@/lib/logistics/config";

// PEEK на следващия export invoice номер БЕЗ да го консумира (§15) — за да се предложи
// автоматично в „Нова експортна доставка", оставайки editable. Реалният номер се заделя
// атомарно чак при save (или ръчно въведеният се валидира за дубликат).
export async function GET() {
  const g = await logisticsApiGuard("view_logistics");
  if (!g.ok) return g.res;
  const seq = await prisma.numberSequence.findFirst({
    where: { companyId: g.companyId, scope: SEQ_SCOPE.exportInvoice, series: "", year: 0 },
    select: { nextValue: true },
  });
  // nextValue сочи следващата стойност; при липса на ред първият номер е 1.
  const value = seq ? seq.nextValue : 1;
  return NextResponse.json({ number: formatSequenceNumber(value, EXPORT_INVOICE_FORMAT) });
}
