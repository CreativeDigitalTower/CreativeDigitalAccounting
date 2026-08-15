import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/session";
import { wouldOrphanCompany } from "@/lib/company/context";
import { z } from "zod";

// Super Admin инструмент за поправка: прехвърляне/свързване на фирма към клиентски
// контекст. Запазва Company record-а и всички данни. Атомарно (Prisma transaction):
// първо се създава target owner membership, чак после се маха грешният relation.

// GET:
//   ?list=1                  → списък фирми + групи (за избор в wizard-а)
//   ?companyId=<id>          → детайл на source фирмата (членове + група)
//   ?targetCompanyId=<id>    → детайл на target фирмата (група + users за избор на owner)
export async function GET(req: Request) {
  try {
    await requireSuperAdmin();
    const url = new URL(req.url);

    if (url.searchParams.get("list")) {
      const [companies, groups] = await Promise.all([
        prisma.company.findMany({ where: { archivedAt: null }, select: { id: true, name: true, eik: true, registrationNumber: true, companyGroupId: true }, orderBy: { name: "asc" } }),
        prisma.companyGroup.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
      ]);
      return NextResponse.json({ companies, groups });
    }

    const companyId = url.searchParams.get("companyId");
    const targetCompanyId = url.searchParams.get("targetCompanyId");
    const id = companyId ?? targetCompanyId;
    if (!id) return NextResponse.json({ error: "Липсва companyId." }, { status: 400 });

    const company = await prisma.company.findUnique({
      where: { id },
      select: {
        id: true, name: true, eik: true, registrationNumber: true, companyGroupId: true,
        companyGroup: { select: { id: true, name: true } },
        companyUsers: { select: { role: true, user: { select: { id: true, name: true, email: true } } } },
      },
    });
    if (!company) return NextResponse.json({ error: "Фирмата не е намерена." }, { status: 404 });
    return NextResponse.json({
      id: company.id, name: company.name, eik: company.eik, registrationNumber: company.registrationNumber,
      companyGroupId: company.companyGroupId, groupName: company.companyGroup?.name ?? null,
      members: company.companyUsers.map((cu) => ({ userId: cu.user.id, name: cu.user.name, email: cu.user.email, role: cu.role })),
    });
  } catch {
    return NextResponse.json({ error: "Няма достъп." }, { status: 403 });
  }
}

const schema = z.object({
  companyId: z.string(),                          // source (напр. MK)
  targetCompanyId: z.string().optional(),         // за валидиране на новите owner users
  addOwnerUserIds: z.array(z.string()).default([]),
  setGroupId: z.string().nullable().optional(),   // undefined = не пипай; null = откачи
  removeUserId: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const { userId: adminId } = await requireSuperAdmin();
    const d = schema.parse(await req.json());

    const source = await prisma.company.findUnique({
      where: { id: d.companyId },
      select: { id: true, name: true, companyGroupId: true, companyUsers: { select: { userId: true, role: true } } },
    });
    if (!source) return NextResponse.json({ error: "Фирмата не е намерена." }, { status: 404 });

    // Новите собственици трябва да са реални users; ако е подадена target фирма — да са
    // нейни членове (клиентски users), за да наследят правилния customer контекст.
    const newOwners = [...new Set(d.addOwnerUserIds.filter(Boolean))];
    if (newOwners.length) {
      if (d.targetCompanyId) {
        const members = await prisma.companyUser.findMany({ where: { companyId: d.targetCompanyId, userId: { in: newOwners } }, select: { userId: true } });
        const ok = new Set(members.map((m) => m.userId));
        const bad = newOwners.filter((u) => !ok.has(u));
        if (bad.length) return NextResponse.json({ error: "Избраните потребители не са членове на целевата фирма." }, { status: 400 });
      } else {
        const users = await prisma.user.findMany({ where: { id: { in: newOwners } }, select: { id: true } });
        if (users.length !== newOwners.length) return NextResponse.json({ error: "Някой потребител не съществува." }, { status: 400 });
      }
    }

    // Задължителен owner: след операцията source трябва да има поне един owner.
    const ownersNow = source.companyUsers.filter((c) => c.role === "owner").map((c) => c.userId);
    const ownersAfter = new Set([...ownersNow, ...newOwners]);
    if (d.removeUserId) ownersAfter.delete(d.removeUserId);
    if (ownersAfter.size === 0) {
      return NextResponse.json({ error: "Трябва поне един собственик. Изберете target owner преди премахване на стария relation." }, { status: 400 });
    }

    const before = { group: source.companyGroupId, members: source.companyUsers.map((c) => `${c.userId}:${c.role}`) };
    const changes: string[] = [];

    await prisma.$transaction(async (tx) => {
      // 1) Първо създаваме новите owner memberships (upsert → без дубликати).
      for (const uid of newOwners) {
        await tx.companyUser.upsert({
          where: { userId_companyId: { userId: uid, companyId: d.companyId } },
          create: { userId: uid, companyId: d.companyId, role: "owner" },
          update: { role: "owner" },
        });
        changes.push(`+owner ${uid}`);
      }
      // 2) Бизнес група.
      if (d.setGroupId !== undefined) {
        await tx.company.update({ where: { id: d.companyId }, data: { companyGroupId: d.setGroupId } });
        changes.push(d.setGroupId ? `group=${d.setGroupId}` : "group detached");
      }
      // 3) Чак сега махаме грешния relation (orphan защита с реалното състояние).
      if (d.removeUserId) {
        const owners = (await tx.companyUser.findMany({ where: { companyId: d.companyId, role: "owner" }, select: { userId: true } })).map((o) => o.userId);
        if (owners.includes(d.removeUserId) && wouldOrphanCompany(owners, d.removeUserId)) throw new Error("ORPHAN");
        await tx.companyUser.deleteMany({ where: { userId: d.removeUserId, companyId: d.companyId } });
        changes.push(`-member ${d.removeUserId}`);
      }
    });

    // Audit: actor + source + old/new memberships + old/new group.
    const after = await prisma.company.findUnique({ where: { id: d.companyId }, select: { companyGroupId: true, companyUsers: { select: { userId: true, role: true } } } });
    await prisma.auditLog.create({ data: {
      companyId: d.companyId, userId: adminId, action: "company_transfer", entity: "Company", entityId: d.companyId,
      summary: `Прехвърляне „${source.name}": ${changes.join(", ") || "без промяна"} | преди group=${before.group ?? "—"} членове=[${before.members.join(", ")}] | след group=${after?.companyGroupId ?? "—"} членове=[${(after?.companyUsers ?? []).map((c) => `${c.userId}:${c.role}`).join(", ")}] | target=${d.targetCompanyId ?? "—"}`,
    } }).catch((e) => console.error("transfer audit", e));

    return NextResponse.json({ success: true, changes });
  } catch (err) {
    if (err instanceof Error && err.message === "ORPHAN") {
      return NextResponse.json({ error: "Не може да се премахне последният собственик. Първо добавете нов собственик." }, { status: 409 });
    }
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Невалидни данни." }, { status: 400 });
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}
