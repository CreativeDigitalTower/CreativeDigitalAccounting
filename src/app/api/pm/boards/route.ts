import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireProjectAccess } from "@/lib/session";
import { z } from "zod";

// GET — всички табла с техните задачи + членове за възлагане
export async function GET() {
  try {
    const { companyId } = await requireProjectAccess();
    const [boards, members] = await Promise.all([
      prisma.projectBoard.findMany({
        where: { companyId, archived: false },
        orderBy: [{ order: "asc" }, { createdAt: "asc" }],
        include: { tasks: { orderBy: [{ order: "asc" }, { createdAt: "asc" }] } },
      }),
      prisma.companyUser.findMany({ where: { companyId }, select: { userId: true, role: true, user: { select: { name: true, email: true } } } }),
    ]);
    return NextResponse.json({
      boards,
      members: members.map((m) => ({ userId: m.userId, name: m.user.name || m.user.email, role: m.role })),
    });
  } catch {
    return NextResponse.json({ boards: [], members: [] }, { status: 200 });
  }
}

const schema = z.object({ name: z.string().min(1), clientId: z.string().optional().nullable(), color: z.string().optional().nullable() });

// POST — създаване на ново табло (фирма/колона). Само за екипа (не служители).
export async function POST(req: Request) {
  try {
    const { companyId, isEmployee } = await requireProjectAccess();
    if (isEmployee) return NextResponse.json({ error: "Нямате права да създавате табла." }, { status: 403 });
    const data = schema.parse(await req.json());
    const count = await prisma.projectBoard.count({ where: { companyId } });
    const board = await prisma.projectBoard.create({
      data: { companyId, name: data.name, clientId: data.clientId ?? null, color: data.color ?? null, order: count },
      include: { tasks: true },
    });
    return NextResponse.json(board);
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Невалидни данни." }, { status: 400 });
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}
