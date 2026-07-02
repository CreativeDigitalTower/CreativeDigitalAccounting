import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email/send";
import { passwordChangedEmail } from "@/lib/email/messages";
import { rateLimit, clientIp } from "@/lib/rate-limit";

export async function POST(req: Request) {
  try {
    if (!rateLimit(`reset-pw:${clientIp(req)}`, 10, 60 * 60 * 1000)) {
      return NextResponse.json({ error: "Твърде много опити. Опитайте по-късно." }, { status: 429 });
    }
    const { token, password } = await req.json();
    if (typeof token !== "string" || typeof password !== "string" || password.length < 8) {
      return NextResponse.json({ error: "Невалидни данни" }, { status: 400 });
    }
    const rec = await prisma.passwordResetToken.findUnique({ where: { token }, include: { user: true } });
    if (!rec || rec.usedAt || rec.expires < new Date()) {
      return NextResponse.json({ error: "Невалиден или изтекъл линк" }, { status: 400 });
    }
    const passwordHash = await bcrypt.hash(password, 12);
    await prisma.$transaction([
      prisma.user.update({ where: { id: rec.userId }, data: { passwordHash, failedLogins: 0, lockedUntil: null } }),
      prisma.passwordResetToken.update({ where: { id: rec.id }, data: { usedAt: new Date() } }),
    ]);
    const m = passwordChangedEmail(rec.user.name || "");
    await sendEmail({ to: rec.user.email, toName: rec.user.name, subject: m.subject, html: m.html, category: m.category, type: "password_changed", force: true });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Сървърна грешка" }, { status: 500 });
  }
}
