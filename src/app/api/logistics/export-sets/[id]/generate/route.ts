import { NextResponse } from "next/server";
import { logisticsApiGuard } from "@/lib/logistics/access";
import { audit } from "@/lib/documents";
import { regenerateSetDocuments } from "@/lib/logistics/exportGenerate";
import { z } from "zod";

const schema = z.object({ force: z.boolean().optional(), docTypes: z.array(z.string()).optional() });

// „Генерирай всички" — създава/обновява активните документи-snapshot от source.
// Не презаписва финализирани (никога) и overridden (освен при force). Връща какво е пропуснато.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await logisticsApiGuard("manage_documents");
  if (!g.ok) return g.res;
  try {
    const { id } = await params;
    const d = schema.parse(await req.json().catch(() => ({})));
    const res = await regenerateSetDocuments(g.companyId, id, g.userId, { force: d.force, docTypes: d.docTypes });
    if (!res) return NextResponse.json({ error: "Не е намерена." }, { status: 404 });
    await audit(g.companyId, g.userId, "generate", "ExportDocumentSet", id,
      `Генерирани документи: ${res.generated.join(", ")}${res.skipped.length ? ` (пропуснати: ${res.skipped.join(", ")})` : ""}`);
    return NextResponse.json({ success: true, generated: res.generated, skipped: res.skipped });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Невалидни данни." }, { status: 400 });
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}
