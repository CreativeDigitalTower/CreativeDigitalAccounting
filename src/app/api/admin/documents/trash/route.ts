import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/session";
import { audit } from "@/lib/documents";
import { z } from "zod";

const schema = z.object({
  action: z.enum(["restore", "permanent"]),
  ids: z.array(z.string()).min(1).max(500),
});

// Супер Админ: масови действия върху изтрити документи на ВСИЧКИ фирми.
export async function POST(req: Request) {
  try {
    const { userId } = await requireSuperAdmin();
    const { action, ids } = schema.parse(await req.json());
    const docs = await prisma.document.findMany({
      where: { id: { in: ids }, deletedAt: { not: null } },
      select: { id: true, companyId: true, number: true },
    });
    if (docs.length === 0) return NextResponse.json({ count: 0 });

    if (action === "permanent") {
      await prisma.document.deleteMany({ where: { id: { in: docs.map((d) => d.id) } } });
    } else {
      await prisma.document.updateMany({ where: { id: { in: docs.map((d) => d.id) } }, data: { deletedAt: null, deletedById: null, deleteReason: null } });
    }
    // Одит запис за всяка засегната фирма
    const verb = action === "permanent" ? "permanent_delete" : "restore";
    const note = action === "permanent" ? "Супер Админ: окончателно изтрит" : "Супер Админ: възстановен";
    for (const d of docs) await audit(d.companyId, userId, verb, "Document", d.id, `${note}: ${d.number}`);

    return NextResponse.json({ count: docs.length });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Невалидни данни." }, { status: 400 });
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}
