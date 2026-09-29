import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCompany, isSuperAdmin, IMPERSONATE_COOKIE, ACTIVE_COMPANY_COOKIE } from "@/lib/session";
import { exportSetReadRole, hasLogisticsAccess } from "@/lib/logistics/access";
import { resolveReceivedInvoice } from "@/lib/logistics/received";

/**
 * Canonical cross-company навигация към MK фактурата на дадена експортна доставка (§13).
 *
 * MK фактурата (Document или легаси MkInvoice) е СОБСТВЕНОСТ на получаващата (MK) фирма
 * — различна от активната (BG) фирма, в чийто контекст се гледа доставката. Затова прекият
 * линк към /dashboard/documents/{id} връща 404 (документът е company-scoped към owner-а).
 *
 * Тук резолвваме owner-а, авторизираме достъпа и УСТАНОВЯВАМЕ owner-контекста чрез
 * СЪЩЕСТВУВАЩИЯ authorized механизъм (Super Admin → IMPERSONATE cookie; член на owner
 * фирмата → ACTIVE_COMPANY cookie), после redirect към реалния detail. Tenant isolation
 * НЕ се bypass-ва — целевата страница пак проверява companyId === активна фирма (§12).
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId, companyId } = await requireCompany();
  const { id } = await params;
  const origin = new URL(req.url).origin;
  const back = (flag?: string) => NextResponse.redirect(`${origin}/dashboard/logistics/export/${id}${flag ? `?mkInvoice=${flag}` : ""}`, { status: 303 });

  if (!(await hasLogisticsAccess(companyId))) return back("denied");

  const set = await prisma.exportDocumentSet.findUnique({
    where: { id }, select: { id: true, companyId: true, buyerCompanyId: true, deletedAt: true },
  });
  if (!set || set.deletedAt) return back();
  // Достъп до самата доставка (продавач или купувач от групата) — както detail-ът.
  if (!(await exportSetReadRole(companyId, set))) return back("denied");

  const owner = set.buyerCompanyId;
  if (!owner) return back("none");

  // Резолюция на активната фактура (§18): Document приоритет, легаси MkInvoice fallback.
  const [docInv, legacyMk] = await Promise.all([
    prisma.document.findFirst({ where: { companyId: owner, type: "invoice", sourceExportSetId: set.id, deletedAt: null, status: { not: "cancelled" } }, select: { id: true, number: true } }),
    prisma.mkInvoice.findFirst({ where: { companyId: owner, sourceExportSetId: set.id }, select: { id: true, number: true, documentId: true } }),
  ]);
  const resolved = resolveReceivedInvoice(docInv, legacyMk);
  if (!resolved) return back("none");

  const target = resolved.kind === "mk"
    ? `/dashboard/logistics/mk-sales/${resolved.id}`
    : `/dashboard/documents/${resolved.id}`;

  // Вече в owner-контекст → отваряме директно, без излишен switch (§16).
  if (companyId === owner) return NextResponse.redirect(`${origin}${target}`, { status: 303 });

  // Авторизация за owner фирмата чрез съществуващите механизми (§13/§14/§15).
  const admin = await isSuperAdmin(userId);
  const member = admin ? null : await prisma.companyUser.findUnique({
    where: { userId_companyId: { userId, companyId: owner } }, select: { companyId: true },
  });
  if (!admin && !member) return back("denied"); // authorized error, НЕ 404, без leak на съдържание

  const res = NextResponse.redirect(`${origin}${target}`, { status: 303 });
  if (admin) {
    // Super Admin technical access — същият cookie като /api/admin/impersonate.
    res.cookies.set(IMPERSONATE_COOKIE, owner, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 60 * 60 * 4 });
  } else {
    // Член на owner фирмата — същият cookie като /api/company/switch (след проверка за членство).
    res.cookies.set(ACTIVE_COMPANY_COOKIE, owner, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30 });
  }
  return res;
}
