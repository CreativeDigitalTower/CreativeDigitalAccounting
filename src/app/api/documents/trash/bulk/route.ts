import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCompany, getMyRole } from "@/lib/session";
import { audit } from "@/lib/documents";
import { canTrash } from "@/lib/permissions";
import { z } from "zod";

const schema = z.object({
  action: z.enum(["restore", "permanent"]),
  ids: z.array(z.string()).min(1).max(500),
});

// Масови действия в Кошчето: възстанови избраните / изтрий окончателно избраните.
export async function POST(req: Request) {
  try {
    const { companyId, userId } = await requireCompany();
    const { action, ids } = schema.parse(await req.json());
    if (!canTrash(await getMyRole(userId, companyId), action === "permanent" ? "permanent" : "restore")) {
      return NextResponse.json({ error: "Нямате нужните права." }, { status: 403 });
    }
    // само документи на фирмата, които са в Кошчето
    const docs = await prisma.document.findMany({
      where: { id: { in: ids }, companyId, deletedAt: { not: null } },
      select: { id: true },
    });
    const okIds = docs.map((d) => d.id);
    if (okIds.length === 0) return NextResponse.json({ count: 0 });

    if (action === "permanent") {
      await prisma.document.deleteMany({ where: { id: { in: okIds } } });
      await audit(companyId, userId, "permanent_delete", "Document", "bulk", `Окончателно изтрити ${okIds.length} документа`);
    } else {
      await prisma.document.updateMany({ where: { id: { in: okIds } }, data: { deletedAt: null, deletedById: null, deleteReason: null } });
      await audit(companyId, userId, "restore", "Document", "bulk", `Възстановени ${okIds.length} документа`);
    }
    return NextResponse.json({ count: okIds.length });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Невалидни данни." }, { status: 400 });
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}
