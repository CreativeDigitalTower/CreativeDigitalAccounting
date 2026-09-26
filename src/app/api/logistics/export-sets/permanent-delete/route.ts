import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logisticsApiGuard } from "@/lib/logistics/access";
import { purgeExportSets } from "@/lib/logistics/purgeExportSets";
import { z } from "zod";

// Окончателно изтриване на trashed експортни доставки: единично, bulk или Изпразни кошчето.
// Валидацията (собствена фирма + в Кошчето) е в purgeExportSets — не се доверяваме на UI (§11/§14/§15).
const schema = z.object({
  ids: z.array(z.string()).max(5000).optional(),
  emptyTrash: z.boolean().optional(),
});

export async function POST(req: Request) {
  const g = await logisticsApiGuard("manage_documents");
  if (!g.ok) return g.res;
  try {
    const body = schema.parse(await req.json().catch(() => ({})));
    if (!body.emptyTrash && (!body.ids || body.ids.length === 0)) {
      return NextResponse.json({ error: "Няма избрани доставки." }, { status: 400 });
    }
    const res = await purgeExportSets(prisma, { companyId: g.companyId, userId: g.userId, ids: body.ids, emptyTrash: body.emptyTrash });
    return NextResponse.json({ ok: true, ...res });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Невалидни данни." }, { status: 400 });
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}
