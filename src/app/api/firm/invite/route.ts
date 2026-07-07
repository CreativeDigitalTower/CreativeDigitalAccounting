import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { getSession, getMyFirm } from "@/lib/session";
import { accountantMaxClients } from "@/lib/constants";
import { sendClientInvite } from "@/lib/firmInvites";
import { z } from "zod";

const schema = z.object({ email: z.string().email(), name: z.string().optional().nullable() });

// Създаване на покана към клиентска фирма (по имейл + реферал линк).
export async function POST(req: Request) {
  try {
    const session = await getSession();
    const userId = session.user!.id as string;
    const firm = await getMyFirm(userId);
    if (!firm) return NextResponse.json({ error: "Само за счетоводни къщи." }, { status: 403 });

    const firmSub = await prisma.subscription.findUnique({ where: { companyId: firm.id }, select: { paymentStatus: true } });
    if (firmSub?.paymentStatus !== "received") {
      return NextResponse.json({ error: "Поканите се активират след потвърждение на плащане на плана." }, { status: 403 });
    }

    const { email, name } = schema.parse(await req.json());

    // Лимит: покани + вече добавени клиенти не бива да надхвърлят тарифата
    const max = accountantMaxClients(firm.firmPlan);
    const [clients, openInvites] = await Promise.all([
      prisma.company.count({ where: { managedByFirmId: firm.id } }),
      prisma.clientInvite.count({ where: { firmId: firm.id, status: "invited" } }),
    ]);
    if (clients + openInvites >= max) {
      return NextResponse.json({ error: `Достигнахте лимита от ${max === Infinity ? "∞" : max} клиентски фирми/покани за плана си.` }, { status: 403 });
    }

    const token = crypto.randomBytes(24).toString("hex");
    const invite = await prisma.clientInvite.create({
      data: { firmId: firm.id, email: email.trim().toLowerCase(), name: name?.trim() || null, token, status: "invited" },
    });

    await sendClientInvite({ firmName: firm.name, partnerCode: firm.partnerCode, email: invite.email, name: invite.name });

    return NextResponse.json({ success: true, id: invite.id });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Невалиден имейл." }, { status: 400 });
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}
