import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, getMyFirm } from "@/lib/session";
import { computeFirmPartnerStats } from "@/lib/partner";
import { COMMISSION_PAYOUT_THRESHOLD } from "@/lib/constants";
import { notifyAdmin } from "@/lib/email/send";

// Заявка за изплащане на натрупана партньорска комисионна.
export async function POST() {
  try {
    const session = await getSession();
    const userId = session.user!.id as string;
    const firm = await getMyFirm(userId);
    if (!firm) return NextResponse.json({ error: "Само за счетоводни къщи." }, { status: 403 });

    const stats = await computeFirmPartnerStats(firm);
    if (stats.availableBalance < COMMISSION_PAYOUT_THRESHOLD) {
      return NextResponse.json({ error: `Минималната сума за изплащане е ${COMMISSION_PAYOUT_THRESHOLD} €.` }, { status: 400 });
    }
    const existing = await prisma.commissionPayout.findFirst({ where: { firmId: firm.id, status: "requested" }, select: { id: true } });
    if (existing) return NextResponse.json({ error: "Вече имате чакаща заявка за изплащане." }, { status: 400 });

    const payout = await prisma.commissionPayout.create({
      data: { firmId: firm.id, amount: stats.availableBalance, status: "requested" },
    });

    try {
      await notifyAdmin(
        `Заявка за изплащане на комисионна — ${firm.name}`,
        `<p>Счетоводна къща <strong>${firm.name}</strong> заяви изплащане на партньорска комисионна: <strong>${stats.availableBalance.toFixed(2)} €</strong>.</p><p>Платени клиенти: ${stats.paidClients} · Процент: ${stats.ratePercent}%.</p>`,
        "admin_commission_payout"
      );
    } catch (e) { console.error("payout notify", e); }

    return NextResponse.json({ success: true, id: payout.id, amount: payout.amount });
  } catch {
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}
