import { NextResponse } from "next/server";
import { logisticsApiGuard } from "@/lib/logistics/access";
import { audit } from "@/lib/documents";
import { promoteToSource, type PromotePatch } from "@/lib/logistics/promoteToSource";
import { z } from "zod";

// Promote-to-source: редактирано споделено поле в документ → централния set + обновяване
// само на eligible downstream draft документи (виж promoteToSource). Seller-scoped.
const schema = z.object({
  invoiceNumber: z.string().max(60).nullable().optional(),
  invoiceDate: z.string().nullable().optional(),
  truck: z.string().max(120).nullable().optional(),
  destination: z.string().max(200).nullable().optional(),
  product: z.string().max(200).nullable().optional(),
  quantity: z.number().positive().nullable().optional(),
  declarationCmrDate: z.string().nullable().optional(),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await logisticsApiGuard("manage_documents");
  if (!g.ok) return g.res;
  try {
    const { id } = await params;
    const patch = schema.parse(await req.json()) as PromotePatch;
    const res = await promoteToSource(g.companyId, id, g.userId, patch);
    if (!res.ok) return NextResponse.json({ error: res.error }, { status: res.status });
    await audit(g.companyId, g.userId, "promote", "ExportDocumentSet", id,
      `Пренос към основни данни; обновени: ${res.regenerate.generated.join(", ")}${res.regenerate.skipped.length ? ` (пропуснати: ${res.regenerate.skipped.join(", ")})` : ""}`);
    return NextResponse.json({ success: true, ...res.regenerate });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Невалидни данни." }, { status: 400 });
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}
