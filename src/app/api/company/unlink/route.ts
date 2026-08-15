import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getEffectiveContext } from "@/lib/session";
import { audit } from "@/lib/documents";
import { wouldOrphanCompany } from "@/lib/company/context";
import { z } from "zod";

const schema = z.object({ companyId: z.string() });

// „Премахни връзката" — премахва членството (CompanyUser) на текущия контекст от фирмата.
// НЕ трие Company record, фактури или документи. Orphan защита: не оставя фирма без owner.
export async function POST(req: Request) {
  try {
    const ctx = await getEffectiveContext();
    const targetUserId = ctx.contextUserId;
    if (!targetUserId) return NextResponse.json({ error: "Няма контекстен собственик." }, { status: 400 });
    const { companyId } = schema.parse(await req.json());

    const membership = await prisma.companyUser.findUnique({
      where: { userId_companyId: { userId: targetUserId, companyId } },
      select: { role: true },
    });
    if (!membership) return NextResponse.json({ error: "Няма връзка към тази фирма." }, { status: 404 });

    // Не разрешаваме unlink на счетоводна къща/управлявана фирма от този flow.
    const company = await prisma.company.findUnique({ where: { id: companyId }, select: { isAccountingFirm: true, managedByFirmId: true } });
    if (company?.isAccountingFirm || company?.managedByFirmId) {
      return NextResponse.json({ error: "Тази фирма се управлява по друг начин (счетоводна къща)." }, { status: 400 });
    }

    // Orphan защита: ако това е последният собственик → блокирай.
    const owners = await prisma.companyUser.findMany({ where: { companyId, role: "owner" }, select: { userId: true } });
    const ownerIds = owners.map((o) => o.userId);
    if (ownerIds.includes(targetUserId) && wouldOrphanCompany(ownerIds, targetUserId)) {
      return NextResponse.json({
        error: "Това е единственият собственик на фирмата. Първо добавете друг собственик (или използвайте админ прехвърляне), за да не остане фирмата без достъп.",
        orphan: true,
      }, { status: 409 });
    }

    await prisma.companyUser.delete({ where: { userId_companyId: { userId: targetUserId, companyId } } });
    // Technical access → записваме следа директно (audit() се пропуска при импърсонация).
    if (ctx.impersonating) {
      await prisma.auditLog.create({ data: { companyId, userId: ctx.actorUserId, action: "unlink_ta", entity: "Company", entityId: companyId, summary: `Премахната връзка (technical access → ${ctx.targetCompanyName ?? ctx.companyId})` } }).catch(() => {});
    } else {
      await audit(companyId, ctx.actorUserId, "unlink", "Company", companyId, "Премахната връзка към фирма (без изтриване)");
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Невалидни данни." }, { status: 400 });
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}
