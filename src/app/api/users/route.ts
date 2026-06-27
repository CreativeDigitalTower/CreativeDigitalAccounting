import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireFeature } from "@/lib/session";
import { audit } from "@/lib/documents";
import { z } from "zod";

const ROLES = ["owner", "manager", "accountant", "sales", "warehouse", "viewer"] as const;

async function guard() {
  const { companyId, userId } = await requireFeature("users");
  const me = await prisma.companyUser.findUnique({ where: { userId_companyId: { userId, companyId } }, select: { role: true } });
  return { companyId, userId, myRole: me?.role };
}

// Промяна на роля
export async function PATCH(req: Request) {
  try {
    const { companyId, userId, myRole } = await guard();
    if (!myRole || !["owner", "manager"].includes(myRole)) return NextResponse.json({ error: "Нямате права." }, { status: 403 });
    const { targetUserId, role } = z.object({ targetUserId: z.string(), role: z.enum(ROLES) }).parse(await req.json());

    if (targetUserId === userId) return NextResponse.json({ error: "Не можете да промените собствената си роля." }, { status: 400 });
    const target = await prisma.companyUser.findUnique({ where: { userId_companyId: { userId: targetUserId, companyId } } });
    if (!target) return NextResponse.json({ error: "Не е намерен." }, { status: 404 });
    // само owner може да назначава/сваля owner
    if ((target.role === "owner" || role === "owner") && myRole !== "owner") {
      return NextResponse.json({ error: "Само собственик може да управлява роля Собственик." }, { status: 403 });
    }
    await prisma.companyUser.update({ where: { userId_companyId: { userId: targetUserId, companyId } }, data: { role } });
    await audit(companyId, userId, "update", "CompanyUser", targetUserId, `роля → ${role}`);
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Невалидни данни." }, { status: 400 });
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}

// Премахване на достъп (изтрива членството във фирмата, не самия акаунт)
export async function DELETE(req: Request) {
  try {
    const { companyId, userId, myRole } = await guard();
    if (!myRole || !["owner", "manager"].includes(myRole)) return NextResponse.json({ error: "Нямате права." }, { status: 403 });
    const { searchParams } = new URL(req.url);
    const targetUserId = searchParams.get("userId");
    if (!targetUserId) return NextResponse.json({ error: "Липсва userId." }, { status: 400 });
    if (targetUserId === userId) return NextResponse.json({ error: "Не можете да премахнете собствения си достъп." }, { status: 400 });

    const target = await prisma.companyUser.findUnique({ where: { userId_companyId: { userId: targetUserId, companyId } } });
    if (!target) return NextResponse.json({ error: "Не е намерен." }, { status: 404 });
    if (target.role === "owner" && myRole !== "owner") {
      return NextResponse.json({ error: "Само собственик може да премахне друг собственик." }, { status: 403 });
    }
    const ownerCount = await prisma.companyUser.count({ where: { companyId, role: "owner" } });
    if (target.role === "owner" && ownerCount <= 1) {
      return NextResponse.json({ error: "Не може да премахнете единствения собственик." }, { status: 400 });
    }
    await prisma.companyUser.delete({ where: { userId_companyId: { userId: targetUserId, companyId } } });
    await audit(companyId, userId, "delete", "CompanyUser", targetUserId, "премахнат достъп");
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}
