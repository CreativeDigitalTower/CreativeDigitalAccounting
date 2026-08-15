import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/session";
import { wouldOrphanCompany } from "@/lib/company/context";
import { z } from "zod";

// Super Admin инструмент за поправка: прехвърляне/свързване на фирма към клиент.
// Позволява: добавяне на собственик (директно или наследен от друга фирма), задаване
// на бизнес група, и премахване на грешно членство (напр. на самия Super Admin) с
// orphan защита. НЕ трие Company/данни.

// GET ?companyId= → преглед на текущите членове + група.
export async function GET(req: Request) {
  try {
    await requireSuperAdmin();
    const companyId = new URL(req.url).searchParams.get("companyId");
    if (!companyId) return NextResponse.json({ error: "Липсва companyId." }, { status: 400 });
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { id: true, name: true, eik: true, countryCode: true, registrationNumber: true, companyGroupId: true,
        companyUsers: { select: { role: true, user: { select: { id: true, name: true, email: true } } } } },
    });
    if (!company) return NextResponse.json({ error: "Фирмата не е намерена." }, { status: 404 });
    return NextResponse.json({
      id: company.id, name: company.name, eik: company.eik, registrationNumber: company.registrationNumber,
      companyGroupId: company.companyGroupId,
      members: company.companyUsers.map((cu) => ({ userId: cu.user.id, name: cu.user.name, email: cu.user.email, role: cu.role })),
    });
  } catch {
    return NextResponse.json({ error: "Няма достъп." }, { status: 403 });
  }
}

const schema = z.object({
  companyId: z.string(),
  addOwnerUserId: z.string().optional(),
  addOwnerFromCompanyId: z.string().optional(), // наследи собственика на друга фирма
  setGroupId: z.string().nullable().optional(),  // undefined = не пипай; null = откачи
  removeUserId: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const { userId: adminId } = await requireSuperAdmin();
    const d = schema.parse(await req.json());
    const company = await prisma.company.findUnique({ where: { id: d.companyId }, select: { id: true, name: true } });
    if (!company) return NextResponse.json({ error: "Фирмата не е намерена." }, { status: 404 });

    // Резолвинг на новия собственик (директно или наследен от друга фирма).
    let addOwnerUserId = d.addOwnerUserId ?? null;
    if (!addOwnerUserId && d.addOwnerFromCompanyId) {
      const src = await prisma.companyUser.findFirst({ where: { companyId: d.addOwnerFromCompanyId, role: "owner" }, select: { userId: true } });
      if (!src) return NextResponse.json({ error: "Изходната фирма няма собственик." }, { status: 400 });
      addOwnerUserId = src.userId;
    }

    const changes: string[] = [];
    await prisma.$transaction(async (tx) => {
      if (addOwnerUserId) {
        await tx.companyUser.upsert({
          where: { userId_companyId: { userId: addOwnerUserId, companyId: d.companyId } },
          create: { userId: addOwnerUserId, companyId: d.companyId, role: "owner" },
          update: { role: "owner" },
        });
        changes.push(`+owner ${addOwnerUserId}`);
      }
      if (d.setGroupId !== undefined) {
        await tx.company.update({ where: { id: d.companyId }, data: { companyGroupId: d.setGroupId } });
        changes.push(d.setGroupId ? `group=${d.setGroupId}` : "group detached");
      }
      if (d.removeUserId) {
        const owners = (await tx.companyUser.findMany({ where: { companyId: d.companyId, role: "owner" }, select: { userId: true } })).map((o) => o.userId);
        // Orphan защита: не махай последния owner.
        if (owners.includes(d.removeUserId) && wouldOrphanCompany(owners, d.removeUserId)) {
          throw new Error("ORPHAN");
        }
        await tx.companyUser.deleteMany({ where: { userId: d.removeUserId, companyId: d.companyId } });
        changes.push(`-member ${d.removeUserId}`);
      }
    });

    await prisma.auditLog.create({ data: { companyId: d.companyId, userId: adminId, action: "company_transfer", entity: "Company", entityId: d.companyId, summary: `Прехвърляне: ${changes.join(", ") || "без промяна"}` } }).catch(() => {});
    return NextResponse.json({ success: true, changes });
  } catch (err) {
    if (err instanceof Error && err.message === "ORPHAN") {
      return NextResponse.json({ error: "Не може да се премахне последният собственик. Първо добавете нов собственик." }, { status: 409 });
    }
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Невалидни данни." }, { status: 400 });
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}
