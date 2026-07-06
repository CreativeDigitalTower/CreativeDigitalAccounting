import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, getMyFirm } from "@/lib/session";
import { sendClientInvite } from "@/lib/firmInvites";
import { z } from "zod";

const schema = z.object({ action: z.enum(["resend", "cancel"]) });

// Повторно изпращане или отмяна на покана.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    const userId = session.user!.id as string;
    const firm = await getMyFirm(userId);
    if (!firm) return NextResponse.json({ error: "Само за счетоводни къщи." }, { status: 403 });

    const { id } = await params;
    const invite = await prisma.clientInvite.findFirst({ where: { id, firmId: firm.id } });
    if (!invite) return NextResponse.json({ error: "Поканата не е намерена." }, { status: 404 });

    const { action } = schema.parse(await req.json());

    if (action === "cancel") {
      await prisma.clientInvite.update({ where: { id }, data: { status: "cancelled" } });
      return NextResponse.json({ success: true });
    }
    // resend
    if (invite.status !== "invited") return NextResponse.json({ error: "Поканата не е активна." }, { status: 400 });
    await sendClientInvite({ firmName: firm.name, partnerCode: firm.partnerCode, email: invite.email, name: invite.name });
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Невалидни данни." }, { status: 400 });
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}
