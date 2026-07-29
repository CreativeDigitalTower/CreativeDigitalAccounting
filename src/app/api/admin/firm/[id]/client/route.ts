import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/session";
import { audit } from "@/lib/documents";
import { accountantMaxClients } from "@/lib/constants";
import { z } from "zod";

// Супер Админ: управление на клиентска фирма на счетоводна къща — откачане или
// прехвърляне към друга къща. НЕ трие данни; само сменя релацията managedByFirmId.
const schema = z.object({
  clientId: z.string(),
  action: z.enum(["detach", "transfer"]),
  targetFirmId: z.string().optional(),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await requireSuperAdmin();
    const { id: firmId } = await params;
    const { clientId, action, targetFirmId } = schema.parse(await req.json());

    // Клиентът трябва наистина да е управляван от тази счетоводна къща (scoping срещу IDOR).
    const client = await prisma.company.findFirst({
      where: { id: clientId, managedByFirmId: firmId },
      select: { id: true, name: true },
    });
    if (!client) return NextResponse.json({ error: "Клиентската фирма не е намерена при тази къща." }, { status: 404 });

    if (action === "detach") {
      await prisma.company.update({ where: { id: clientId }, data: { managedByFirmId: null } });
      await audit(clientId, userId, "update", "Company", clientId, `Откачена от счетоводна къща ${firmId}`);
      await audit(firmId, userId, "update", "Company", firmId, `Откачен клиент ${client.name}`);
      return NextResponse.json({ success: true });
    }

    // transfer
    if (!targetFirmId) return NextResponse.json({ error: "Липсва целева счетоводна къща." }, { status: 400 });
    if (targetFirmId === firmId) return NextResponse.json({ error: "Клиентът вече е при тази къща." }, { status: 400 });
    const target = await prisma.company.findFirst({
      where: { id: targetFirmId, isAccountingFirm: true, archivedAt: null },
      select: { id: true, name: true, firmPlan: true },
    });
    if (!target) return NextResponse.json({ error: "Целевата счетоводна къща не е намерена." }, { status: 404 });

    // Проверка на лимита на целевата къща.
    const max = accountantMaxClients(target.firmPlan);
    const current = await prisma.company.count({ where: { managedByFirmId: targetFirmId } });
    if (current >= max) {
      return NextResponse.json({ error: `Целевата къща е достигнала лимита си (${max === Infinity ? "∞" : max}).` }, { status: 400 });
    }

    await prisma.company.update({ where: { id: clientId }, data: { managedByFirmId: targetFirmId } });
    await audit(clientId, userId, "update", "Company", clientId, `Прехвърлена от къща ${firmId} към ${target.name}`);
    await audit(firmId, userId, "update", "Company", firmId, `Прехвърлен клиент ${client.name} → ${target.name}`);
    await audit(targetFirmId, userId, "update", "Company", targetFirmId, `Приет клиент ${client.name}`);
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Невалидни данни." }, { status: 400 });
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}
